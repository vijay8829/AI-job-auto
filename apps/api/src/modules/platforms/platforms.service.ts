import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import { prisma } from '@ai-job/database';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class PlatformsService {
  private readonly encryptionKey: string;
  private static readonly PLATFORMS_CACHE_KEY = 'platforms:all';
  private static readonly PLATFORMS_TTL = 300; // 5 min

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.encryptionKey = config.getOrThrow('ENCRYPTION_KEY');
  }

  async getAllPlatforms() {
    const cached = await this.redis.get<any[]>(PlatformsService.PLATFORMS_CACHE_KEY);
    if (cached) return cached;

    const platforms = await prisma.jobPlatform.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
    });

    await this.redis.set(PlatformsService.PLATFORMS_CACHE_KEY, platforms, PlatformsService.PLATFORMS_TTL);
    return platforms;
  }

  async getUserPlatformAccounts(userId: string) {
    return prisma.platformAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platformId: true,
        username: true,
        status: true,
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        platform: true,
      },
    });
  }

  async connectPlatform(userId: string, platformId: string, credentials: { username?: string; password?: string; accessToken?: string }) {
    const platform = await prisma.jobPlatform.findUnique({ where: { id: platformId } });
    if (!platform) throw new NotFoundException('Platform not found');

    // Only enforce the limit when adding a brand-new connection (not when reconnecting an existing one)
    const existing = await prisma.platformAccount.findUnique({ where: { userId_platformId: { userId, platformId } } });
    if (!existing) {
      const usageLimit = await prisma.usageLimit.findUnique({ where: { userId } });
      const currentConnections = await prisma.platformAccount.count({ where: { userId, isActive: true } });
      if (usageLimit && currentConnections >= usageLimit.platformConnectionsLimit) {
        throw new BadRequestException('Platform connection limit reached. Please upgrade your plan.');
      }
    }

    const encryptedCredentials = credentials.password
      ? CryptoJS.AES.encrypt(JSON.stringify(credentials), this.encryptionKey).toString()
      : null;

    return prisma.platformAccount.upsert({
      where: { userId_platformId: { userId, platformId } },
      create: {
        userId,
        platformId,
        username: credentials.username,
        encryptedCredentials,
        accessToken: credentials.accessToken,
        status: 'ACTIVE',
        isActive: true,
      },
      update: {
        username: credentials.username,
        encryptedCredentials,
        accessToken: credentials.accessToken,
        status: 'ACTIVE',
        isActive: true,
        syncError: null,
      },
      include: { platform: true },
    });
  }

  async disconnectPlatform(userId: string, platformId: string) {
    const account = await prisma.platformAccount.findFirst({ where: { userId, platformId } });
    if (!account) throw new NotFoundException('Platform account not found');

    await prisma.platformAccount.update({
      where: { id: account.id },
      data: { isActive: false, status: 'INACTIVE' },
    });

    return { message: 'Platform disconnected successfully' };
  }

  async injectSessionCookies(userId: string, platformId: string, cookies: any[]) {
    const account = await prisma.platformAccount.findFirst({ where: { userId, platformId, isActive: true } });
    if (!account) throw new NotFoundException('Active platform account not found — connect the platform first');

    await prisma.platformAccount.update({
      where: { id: account.id },
      data: {
        cookieData: JSON.stringify(cookies),
        status: 'ACTIVE',
        syncError: null,
        lastSyncAt: new Date(),
      },
    });

    return { message: `${cookies.length} session cookies stored. Next automation run will skip login.` };
  }

  decryptCredentials(encrypted: string): Record<string, string> {
    const bytes = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }
}
