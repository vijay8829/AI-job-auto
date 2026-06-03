import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@ai-job/database';
import { StartAutomationDto } from './dto/start-automation.dto';
import { BrowserSemaphoreService } from '../platforms/browser-semaphore.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue('auto-apply') private readonly applyQueue: Queue,
    private readonly browserSemaphore: BrowserSemaphoreService,
  ) {}

  async startAutoApply(userId: string, dto: StartAutomationDto) {
    // Validate usage limits
    const usageLimit = await prisma.usageLimit.findUnique({ where: { userId } });
    if (usageLimit && usageLimit.applicationsThisMonth >= usageLimit.applicationsLimit) {
      throw new ForbiddenException('Monthly application limit reached. Please upgrade your plan.');
    }

    // Validate job + platform account
    const job = await prisma.job.findUnique({ where: { id: dto.jobId }, include: { platform: true } });
    if (!job) throw new NotFoundException('Job not found');

    const platformAccount = await prisma.platformAccount.findFirst({
      where: { userId, platformId: job.platformId, isActive: true },
    });
    if (!platformAccount) {
      throw new ForbiddenException(`No active account for ${job.platform.displayName}. Please connect your account first.`);
    }

    // Get resume
    const resume = await prisma.resume.findFirst({
      where: { id: dto.resumeId || undefined, userId, ...(dto.resumeId ? {} : { isDefault: true }) },
    });
    if (!resume) throw new NotFoundException('No resume found. Please upload a resume first.');

    // Create automation log
    const automationLog = await prisma.automationLog.create({
      data: {
        userId,
        jobId: job.id,
        platformId: job.platformId,
        status: 'QUEUED',
        totalSteps: 0,
        completedSteps: 0,
      },
    });

    // Create pending application
    const application = await prisma.application.upsert({
      where: { userId_jobId: { userId, jobId: dto.jobId } },
      create: {
        userId,
        jobId: dto.jobId,
        resumeId: resume.id,
        status: 'PENDING',
        isAutoApplied: true,
        automationId: automationLog.id,
        coverLetter: dto.coverLetter,
      },
      update: {
        resumeId: resume.id,
        isAutoApplied: true,
        automationId: automationLog.id,
        coverLetter: dto.coverLetter,
        status: 'PENDING',
      },
    });

    // Queue the automation job
    const bullJob = await this.applyQueue.add(
      'apply-to-job',
      {
        automationLogId: automationLog.id,
        applicationId: application.id,
        userId,
        jobId: job.id,
        platformName: job.platform.name,
        platformAccountId: platformAccount.id,
        jobUrl: job.externalUrl,
        applyUrl: job.applyUrl || job.externalUrl,
        resumeId: resume.id,
        resumeUrl: resume.fileUrl,
        coverLetter: dto.coverLetter,
        answers: dto.answers || {},
        mode: dto.mode || 'SEMI_AUTO',
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, priority: 2 },
    );

    return {
      automationLogId: automationLog.id,
      applicationId: application.id,
      queueJobId: bullJob.id,
      status: 'QUEUED',
      message: 'Application automation started. You will be notified when ready for review.',
    };
  }

  async getAutomationLogs(userId: string, page = 1, limit = 20) {
    const [logs, total] = await Promise.all([
      prisma.automationLog.findMany({
        where: { userId },
        include: {
          applications: {
            include: { job: { include: { platform: { select: { name: true, displayName: true } } } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.automationLog.count({ where: { userId } }),
    ]);

    return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAutomationStatus(userId: string, automationLogId: string) {
    const log = await prisma.automationLog.findFirst({ where: { id: automationLogId, userId } });
    if (!log) throw new NotFoundException('Automation log not found');
    return log;
  }

  async cancelAutomation(userId: string, automationLogId: string) {
    const log = await prisma.automationLog.findFirst({
      where: { id: automationLogId, userId, status: { in: ['QUEUED', 'RUNNING'] } },
    });
    if (!log) throw new NotFoundException('Active automation not found');

    return prisma.automationLog.update({
      where: { id: automationLogId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async submitReviewedApplication(userId: string, automationLogId: string) {
    const log = await prisma.automationLog.findFirst({
      where: { id: automationLogId, userId, status: 'NEEDS_REVIEW' },
    });
    if (!log) throw new NotFoundException('Application not in review state');

    // Queue the final submit step
    await this.applyQueue.add(
      'submit-application',
      { automationLogId, userId, sessionData: log.sessionData },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, priority: 1 },
    );

    return { message: 'Final submission queued' };
  }

  async getQueueStats() {
    const withTimeout = <T>(p: Promise<T>, fallback: T, ms = 4000): Promise<T> =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      withTimeout(this.applyQueue.getWaitingCount(), 0),
      withTimeout(this.applyQueue.getActiveCount(), 0),
      withTimeout(this.applyQueue.getCompletedCount(), 0),
      withTimeout(this.applyQueue.getFailedCount(), 0),
      withTimeout(this.applyQueue.getDelayedCount(), 0),
    ]);
    const browser = this.browserSemaphore.getStats();
    return { waiting, active, completed, failed, delayed, browser };
  }

  async getAutomationAnalytics(userId: string) {
    const logs = await prisma.automationLog.findMany({
      where: { userId },
      select: { status: true, durationMs: true, errorMessage: true, createdAt: true, platformId: true },
    });

    const total = logs.length;
    const completed = logs.filter((l) => l.status === 'COMPLETED').length;
    const failed = logs.filter((l) => l.status === 'FAILED').length;
    const captchaBlocked = logs.filter((l) => /captcha|challenge|verify/i.test(l.errorMessage || '')).length;
    const loginFailed = logs.filter((l) => /login|auth|credential/i.test(l.errorMessage || '')).length;
    const selectorFailed = logs.filter((l) => /selector|timeout|element/i.test(l.errorMessage || '')).length;

    const durations = logs.filter((l) => l.durationMs).map((l) => l.durationMs as number);
    const avgDurationMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Resolve platformId → name in one batch query
    const platformIds = [...new Set(logs.map((l) => l.platformId).filter(Boolean))] as string[];
    const platforms = platformIds.length
      ? await prisma.jobPlatform.findMany({ where: { id: { in: platformIds } }, select: { id: true, name: true } })
      : [];
    const platformNameMap = Object.fromEntries(platforms.map((p) => [p.id, p.name]));

    const byPlatform: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const log of logs) {
      const name = (log.platformId && platformNameMap[log.platformId]) || 'unknown';
      if (!byPlatform[name]) byPlatform[name] = { total: 0, completed: 0, failed: 0 };
      byPlatform[name].total++;
      if (log.status === 'COMPLETED') byPlatform[name].completed++;
      if (log.status === 'FAILED') byPlatform[name].failed++;
    }

    // Daily activity — last 14 days
    const dailyMap: Record<string, number> = {};
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    for (const log of logs.filter((l) => l.createdAt > cutoff)) {
      const day = log.createdAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      failed,
      captchaBlocked,
      failureReasons: { captchaBlocked, loginFailed, selectorFailed, other: Math.max(0, failed - captchaBlocked - loginFailed - selectorFailed) },
      avgDurationMs,
      avgDurationSec: Math.round(avgDurationMs / 1000),
      byPlatform,
      daily,
    };
  }

  async getFailedQueueJobs(limit = 20) {
    const jobs = await this.applyQueue.getFailed(0, limit - 1);
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
      data: { userId: j.data?.userId, platformName: j.data?.platformName, jobId: j.data?.jobId },
    }));
  }
}
