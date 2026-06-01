import { Injectable } from '@nestjs/common';
import { prisma } from '@ai-job/database';

@Injectable()
export class AnalyticsService {
  async getUserAnalytics(userId: string) {
    const [appStats, platformStats, topCompanies, atsScores, weeklyActivity] = await Promise.all([
      this.getApplicationStats(userId),
      this.getPlatformBreakdown(userId),
      this.getTopCompanies(userId),
      this.getAtsScoreDistribution(userId),
      this.getWeeklyActivity(userId),
    ]);

    return { appStats, platformStats, topCompanies, atsScores, weeklyActivity };
  }

  private async getApplicationStats(userId: string) {
    const statuses = ['PENDING', 'APPLIED', 'UNDER_REVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    const counts = await Promise.all(
      statuses.map((s) => prisma.application.count({ where: { userId, status: s as any } })),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  private async getPlatformBreakdown(userId: string) {
    const apps = await prisma.application.findMany({
      where: { userId, appliedAt: { not: null } },
      include: { job: { include: { platform: { select: { name: true, displayName: true } } } } },
    });

    const breakdown: Record<string, { applied: number; interviews: number; platform: string }> = {};
    for (const app of apps) {
      const name = app.job.platform.name;
      if (!breakdown[name]) breakdown[name] = { applied: 0, interviews: 0, platform: app.job.platform.displayName };
      breakdown[name].applied++;
      if (['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_RECEIVED'].includes(app.status)) {
        breakdown[name].interviews++;
      }
    }
    return Object.values(breakdown);
  }

  private async getTopCompanies(userId: string) {
    const apps = await prisma.application.findMany({
      where: { userId },
      include: { job: { select: { company: true, companyLogoUrl: true } } },
    });
    const companies: Record<string, { count: number; logo?: string }> = {};
    for (const app of apps) {
      const co = app.job.company;
      if (!companies[co]) companies[co] = { count: 0, logo: app.job.companyLogoUrl || undefined };
      companies[co].count++;
    }
    return Object.entries(companies).sort(([, a], [, b]) => b.count - a.count).slice(0, 10).map(([company, data]) => ({ company, ...data }));
  }

  private async getAtsScoreDistribution(userId: string) {
    const scores = await prisma.aiScore.findMany({
      where: { userId },
      select: { overallScore: true, atsScore: true, skillMatchScore: true },
    });
    if (scores.length === 0) return { avg: 0, high: 0, medium: 0, low: 0 };
    const avg = Math.round(scores.reduce((s, a) => s + a.overallScore, 0) / scores.length);
    return {
      avg,
      high: scores.filter((s) => s.overallScore >= 75).length,
      medium: scores.filter((s) => s.overallScore >= 50 && s.overallScore < 75).length,
      low: scores.filter((s) => s.overallScore < 50).length,
      avgAts: Math.round(scores.reduce((s, a) => s + (a.atsScore || 0), 0) / scores.length),
    };
  }

  private async getWeeklyActivity(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const apps = await prisma.application.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const app of apps) {
      const key = app.createdAt.toISOString().slice(0, 10);
      if (key in days) days[key]++;
    }
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }

  async getAdminAnalytics() {
    const [totalUsers, totalApplications, totalJobs, activeAutomations] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.application.count(),
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      prisma.automationLog.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
    ]);

    const planBreakdown = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { userId: true },
    });

    return { totalUsers, totalApplications, totalJobs, activeAutomations, planBreakdown };
  }
}
