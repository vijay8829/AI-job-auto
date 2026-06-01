import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { prisma } from '@ai-job/database';

@Injectable()
export class NotificationListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('application.submitted')
  async handleApplicationSubmitted({ userId, applicationId }: { userId: string; applicationId: string; automationLogId: string }) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { title: true, company: true } } },
    });
    if (app) {
      await this.notificationsService.notifyApplicationSubmitted(userId, app.job.title, app.job.company);
    }
  }

  @OnEvent('automation.needs-review')
  async handleNeedsReview({ userId, automationLogId }: { userId: string; automationLogId: string }) {
    const log = await prisma.automationLog.findUnique({
      where: { id: automationLogId },
      include: { applications: { include: { job: { select: { title: true, company: true } } }, take: 1 } },
    });
    if (log?.applications[0]) {
      const { title, company } = log.applications[0].job;
      await this.notificationsService.notifyNeedsReview(userId, automationLogId, title, company);
    }
  }

  @OnEvent('resume.parsed')
  async handleResumeParsed({ userId, resumeId }: { userId: string; resumeId: string }) {
    await this.notificationsService.createNotification(
      userId,
      'RESUME_PARSED',
      'Resume Parsed Successfully!',
      'Your resume has been analyzed by AI. Check your profile for extracted skills and experience.',
      { resumeId },
    );
  }
}
