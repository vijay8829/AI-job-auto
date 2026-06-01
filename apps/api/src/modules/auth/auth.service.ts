import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { prisma } from '@ai-job/database';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../common/services/redis.service';

const LOGIN_FAIL_KEY = (email: string) => `auth:fail:${email.toLowerCase()}`;
const LOGIN_LOCK_KEY = (email: string) => `auth:lock:${email.toLowerCase()}`;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL = 15 * 60; // 15 minutes
const FAIL_WINDOW_TTL = 10 * 60; // rolling 10-minute window

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        profile: { create: {} },
        subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        usageLimits: {
          create: {
            applicationsLimit: 10,
            aiOptimizationsLimit: 3,
            resumeUploadsLimit: 2,
            platformConnectionsLimit: 2,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

    return { user, ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase();

    // Check lockout
    const locked = await this.redis.get<number>(LOGIN_LOCK_KEY(email));
    if (locked) {
      const ttl = await this.redis.client.ttl(LOGIN_LOCK_KEY(email));
      const mins = Math.ceil(ttl / 60);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.passwordHash) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — clear fail counters
    await this.redis.del(LOGIN_FAIL_KEY(email), LOGIN_LOCK_KEY(email));

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    try {
      const key = LOGIN_FAIL_KEY(email);
      const attempts = await this.redis.client.incr(key);
      if (attempts === 1) await this.redis.client.expire(key, FAIL_WINDOW_TTL);
      if (attempts >= MAX_ATTEMPTS) {
        await this.redis.set(LOGIN_LOCK_KEY(email), 1, LOCKOUT_TTL);
        await this.redis.del(key);
        this.logger.warn(`Account locked after ${MAX_ATTEMPTS} failed attempts: ${email}`);
      }
    } catch {
      // Redis failure must not block login flow
    }
  }

  async googleAuth(googleUser: { googleId: string; email: string; firstName: string; lastName: string; avatarUrl?: string }, ipAddress?: string, userAgent?: string) {
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          googleId: googleUser.googleId,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          avatarUrl: googleUser.avatarUrl,
          isVerified: true,
          emailVerifiedAt: new Date(),
          profile: { create: {} },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
          usageLimits: {
            create: {
              applicationsLimit: 10,
              aiOptimizationsLimit: 3,
              resumeUploadsLimit: 2,
              platformConnectionsLimit: 2,
              resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            },
          },
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: googleUser.googleId, isVerified: true } });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

    return { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const session = await prisma.userSession.findFirst({
      where: { userId, refreshToken: tokenHash },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('User not found or deactivated');

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Rotate refresh token — store hash, return raw
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await prisma.userSession.deleteMany({ where: { userId, refreshToken: this.hashToken(refreshToken) } });
  }

  async logoutAll(userId: string) {
    await prisma.userSession.deleteMany({ where: { userId } });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, firstName: true },
    });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const ttl = 60 * 60; // 1 hour
      await this.redis.set(`reset:${token}`, user.id, ttl);
      const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      this.logger.log(`Password reset token stored for user ${user.id}. Reset URL: ${resetUrl}`);
      // Send email if SendGrid is configured
      await this.sendResetEmail(email, user.firstName, resetUrl).catch(() => {});
    }
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redis.get<string>(`reset:${token}`);
    if (!userId) {
      throw new UnauthorizedException('Reset token is invalid or has expired');
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.redis.del(`reset:${token}`);
    await prisma.userSession.deleteMany({ where: { userId } });
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  private async sendResetEmail(email: string, firstName: string, resetUrl: string): Promise<void> {
    const sgKey = this.config.get<string>('SENDGRID_API_KEY', '');
    if (!sgKey.startsWith('SG.')) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sgKey);
    const from = this.config.get('FROM_EMAIL', 'noreply@ai-job-platform.com');
    await sgMail.send({
      to: email,
      from,
      subject: 'Reset your AI Job Platform password',
      html: `<h2>Hi ${firstName},</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) throw new BadRequestException('Password change not available for OAuth accounts');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await prisma.userSession.deleteMany({ where: { userId } });
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const jti = crypto.randomUUID();
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwtService.signAsync({ ...payload, jti }, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
    await prisma.userSession.create({
      data: {
        userId,
        refreshToken: this.hashToken(refreshToken),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.passwordHash || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash: _, ...result } = user;
    return result;
  }
}
