import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ai-job/database';

@Injectable()
export class ApplicationsService {
  async getApplications(userId: string, status?: string) {
    return prisma.application.findMany({
      where: { userId, ...(status ? { status: status as any } : {}) },
      include: {
        job: {
          include: { platform: { select: { name: true, displayName: true, logoUrl: true } } },
        },
        resume: { select: { id: true, name: true } },
        automationLog: { select: { status: true, screenshotUrls: true, durationMs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getApplication(userId: string, applicationId: string) {
    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        job: { include: { platform: true, aiScores: { where: { userId }, take: 1 } } },
        resume: true,
        automationLog: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateStatus(userId: string, applicationId: string, status: string, notes?: string) {
    const app = await prisma.application.findFirst({ where: { id: applicationId, userId } });
    if (!app) throw new NotFoundException('Application not found');

    return prisma.application.update({
      where: { id: applicationId },
      data: {
        status: status as any,
        notes,
        ...(status === 'APPLIED' ? { appliedAt: new Date() } : {}),
        ...(status === 'INTERVIEW_SCHEDULED' ? { respondedAt: new Date() } : {}),
      },
    });
  }

  async getDashboardStats(userId: string) {
    const [total, applied, interviews, offers, rejected] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: 'APPLIED' } }),
      prisma.application.count({ where: { userId, status: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'] } } }),
      prisma.application.count({ where: { userId, status: 'OFFER_RECEIVED' } }),
      prisma.application.count({ where: { userId, status: 'REJECTED' } }),
    ]);

    // Last 30 days activity — group by calendar day, not exact timestamp
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE_TRUNC('day', "created_at")::date::text AS date, COUNT(*)::int AS count
      FROM "applications"
      WHERE "user_id" = ${userId}::uuid AND "created_at" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "created_at")
      ORDER BY date ASC
    `;

    const successRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;
    const responseRate = applied > 0 ? Math.round(((interviews + offers + rejected) / applied) * 100) : 0;

    return {
      total, applied, interviews, offers, rejected, successRate, responseRate,
      pending: total - applied - rejected - interviews - offers,
      recentActivity,
    };
  }

  async getApplicationTimeline(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE_TRUNC('day', "created_at")::date::text AS date, COUNT(*)::int AS count
      FROM "applications"
      WHERE "user_id" = ${userId}::uuid AND "created_at" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "created_at")
      ORDER BY date ASC
    `;

    // Fill in missing days so the chart always has 7 points
    const result: Array<{ date: string; count: number }> = [];
    const rowMap = new Map(rows.map((r) => [r.date, r.count]));
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: rowMap.get(key) ?? 0 });
    }
    return result;
  }
}
