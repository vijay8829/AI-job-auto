import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { prisma } from '@ai-job/database';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DlqMonitorService {
  private readonly logger = new Logger(DlqMonitorService.name);

  constructor(
    @InjectQueue('auto-apply') private readonly queue: Queue,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Run every 10 minutes — check for failed jobs and notify affected users
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processDlq() {
    try {
      const failed = await this.queue.getFailed(0, 50);
      if (failed.length === 0) return;

      this.logger.warn(`DLQ: ${failed.length} failed jobs found`);

      // Group by userId to avoid spamming notifications
      const notified = new Set<string>();

      for (const job of failed) {
        const userId = job.data?.userId;
        const automationLogId = job.data?.automationLogId;
        if (!userId || notified.has(userId)) continue;

        // Only notify if the log is still in RUNNING state (job failed silently)
        const log = await prisma.automationLog.findFirst({
          where: { id: automationLogId, userId, status: 'RUNNING' },
          include: { applications: { include: { job: true } } },
        });

        if (log) {
          const jobTitle = log.applications[0]?.job?.title || 'a job';
          const company = log.applications[0]?.job?.company || '';

          // Mark as failed in DB
          await prisma.automationLog.update({
            where: { id: automationLogId },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              errorMessage: job.failedReason || 'Worker process crashed — job recovered from failed queue',
            },
          });

          // Notify user
          await this.notificationsService.createNotification(
            userId,
            'SYSTEM_ALERT' as any,
            'Application automation failed',
            `The automation for ${jobTitle}${company ? ` at ${company}` : ''} encountered an error and was stopped. You can retry from the Automation page.`,
            { automationLogId, jobTitle, company, reason: 'worker_crash' },
          ).catch(() => {});

          notified.add(userId);
          this.logger.warn(`DLQ: notified user ${userId} for failed job ${job.id}`);
        }

        // Remove from DLQ after processing (prevents repeated alerts)
        await job.remove().catch(() => {});
      }
    } catch (err: any) {
      this.logger.error(`DLQ monitor error: ${err.message}`);
    }
  }

  // Run daily at midnight — clean up stuck RUNNING logs older than 1 hour
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanStuckLogs() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const stuck = await prisma.automationLog.updateMany({
        where: { status: 'RUNNING', startedAt: { lt: oneHourAgo } },
        data: { status: 'FAILED', completedAt: new Date(), errorMessage: 'Automation timed out — worker may have restarted' },
      });
      if (stuck.count > 0) {
        this.logger.warn(`Cleaned ${stuck.count} stuck RUNNING automation logs`);
      }
    } catch (err: any) {
      this.logger.error(`Stuck log cleanup error: ${err.message}`);
    }
  }
}
