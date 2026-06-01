import { Injectable } from '@nestjs/common';
import { prisma } from '@ai-job/database';

@Injectable()
export class AdminService {
  async getUsers(page = 1, limit = 20, search?: string) {
    const where = search ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { firstName: { contains: search, mode: 'insensitive' as const } }] } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { ...where, deletedAt: null },
        include: { subscription: { select: { plan: true, status: true } }, _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, subscription: true, _count: true },
      }),
      prisma.user.count({ where: { ...where, deletedAt: null } }),
    ]);
    return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async deactivateUser(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  async getPlatforms() {
    return prisma.jobPlatform.findMany({
      include: { _count: { select: { jobs: true, platformAccounts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlatform(platformId: string, data: any) {
    return prisma.jobPlatform.update({ where: { id: platformId }, data });
  }

  async getSystemStats() {
    const [users, jobs, applications, automations] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.job.count(),
      prisma.application.count(),
      prisma.automationLog.count(),
    ]);

    const recentSignups = await prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const planBreakdown = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { userId: true },
    });

    const failedAutomations = await prisma.automationLog.count({ where: { status: 'FAILED' } });
    const successfulAutomations = await prisma.automationLog.count({ where: { status: 'COMPLETED' } });

    return { users, jobs, applications, automations, recentSignups, planBreakdown, failedAutomations, successfulAutomations };
  }
}
