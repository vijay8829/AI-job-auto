import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ai-job/database';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        avatarUrl: true, role: true, isVerified: true,
        subscription: { select: { plan: true, status: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUsage(userId: string) {
    const [usage, subscription] = await Promise.all([
      prisma.usageLimit.findUnique({ where: { userId } }),
      prisma.subscription.findFirst({ where: { userId } }),
    ]);
    if (!usage) throw new NotFoundException('Usage data not found');
    return {
      plan: subscription?.plan || 'FREE',
      applications: { used: usage.applicationsThisMonth, limit: usage.applicationsLimit, resetDate: usage.resetDate },
      aiOptimizations: { used: usage.aiOptimizationsUsed, limit: usage.aiOptimizationsLimit },
      resumeUploads: { used: usage.resumeUploads, limit: usage.resumeUploadsLimit },
      platformConnections: { used: usage.platformConnections, limit: usage.platformConnectionsLimit },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: { workExperiences: { orderBy: { startDate: 'desc' } }, educations: { orderBy: { startDate: 'desc' } }, certifications: { orderBy: { issuedAt: 'desc' } } },
        },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        usageLimits: true,
        _count: { select: { resumes: true, applications: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const { passwordHash: _, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { workExperiences, educations, certifications, ...profileData } = dto;

    return prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });

      // Update work experiences if provided
      if (workExperiences !== undefined) {
        await tx.workExperience.deleteMany({ where: { profileId: profile.id } });
        if (workExperiences.length > 0) {
          await tx.workExperience.createMany({ data: workExperiences.map((e) => ({ ...e, profileId: profile.id })) });
        }
      }

      // Update educations if provided
      if (educations !== undefined) {
        await tx.education.deleteMany({ where: { profileId: profile.id } });
        if (educations.length > 0) {
          await tx.education.createMany({ data: educations.map((e) => ({ ...e, profileId: profile.id })) });
        }
      }

      // Calculate profile completeness
      const completeness = this.calcCompleteness(profile, workExperiences, educations);
      await tx.userProfile.update({ where: { id: profile.id }, data: { profileCompleteness: completeness } });

      return tx.userProfile.findUnique({
        where: { id: profile.id },
        include: { workExperiences: true, educations: true, certifications: true },
      });
    });
  }

  async patchUser(userId: string, data: { name?: string; title?: string; location?: string; bio?: string; onboardingCompletedAt?: string }) {
    const { title, location, bio, name, onboardingCompletedAt } = data;
    if (name) {
      const parts = name.trim().split(' ');
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ') || (parts[0] ?? '');
      await prisma.user.update({ where: { id: userId }, data: { firstName, lastName } });
    }
    const profileUpdate: Record<string, any> = {};
    if (title !== undefined) profileUpdate.headline = title;
    if (location !== undefined) profileUpdate.location = location;
    if (bio !== undefined) profileUpdate.summary = bio;
    if (onboardingCompletedAt !== undefined) profileUpdate.onboardingCompletedAt = new Date(onboardingCompletedAt);
    if (Object.keys(profileUpdate).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileUpdate },
        update: profileUpdate,
      });
    }
    return this.getProfile(userId);
  }

  async updateNotificationPreferences(_userId: string, _prefs: Record<string, boolean>) {
    // Notification preferences are stored client-side until a dedicated schema field is added
    return { updated: true };
  }

  async deleteAccount(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async updateUser(userId: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return prisma.user.update({ where: { id: userId }, data });
  }

  private calcCompleteness(profile: any, experiences?: any[], educations?: any[]): number {
    let score = 0;
    if (profile.headline) score += 10;
    if (profile.summary) score += 15;
    if (profile.phone) score += 5;
    if (profile.location) score += 5;
    if (profile.skills?.length >= 5) score += 15;
    if (profile.preferredRoles?.length > 0) score += 10;
    if (profile.linkedinUrl) score += 5;
    if (experiences && experiences.length > 0) score += 20;
    if (educations && educations.length > 0) score += 10;
    if (profile.salaryMin || profile.salaryMax) score += 5;
    return Math.min(score, 100);
  }
}
