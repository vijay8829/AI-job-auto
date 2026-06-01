import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sgMail: typeof import('@sendgrid/mail') = require('@sendgrid/mail');
import { prisma, NotificationType } from '@ai-job/database';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly emailEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    const key = config.get('SENDGRID_API_KEY', '');
    this.emailEnabled = key.startsWith('SG.');
    if (this.emailEnabled) sgMail.setApiKey(key);
  }

  async createNotification(userId: string, type: NotificationType, title: string, body: string, data?: any) {
    return prisma.notification.create({
      data: { userId, type, title, body, data: data || {} },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async sendEmailNotification(to: string, subject: string, html: string) {
    if (!this.emailEnabled) {
      this.logger.debug(`Email skipped (SENDGRID_API_KEY not configured): ${subject}`);
      return;
    }
    const fromEmail = this.config.get('FROM_EMAIL', 'noreply@ai-job-platform.com');
    const fromName = this.config.get('FROM_NAME', 'AI Job Platform');
    try {
      await sgMail.send({ to, from: { email: fromEmail, name: fromName }, subject, html });
    } catch (error) {
      this.logger.warn(`Email send failed to ${to}: ${error.message}`);
    }
  }

  async notifyApplicationSubmitted(userId: string, jobTitle: string, company: string) {
    const notification = await this.createNotification(
      userId,
      'APPLICATION_SUBMITTED',
      'Application Submitted!',
      `Your application to ${jobTitle} at ${company} has been submitted successfully.`,
      { jobTitle, company },
    );

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    if (user) {
      await this.sendEmailNotification(
        user.email,
        `Application Submitted: ${jobTitle} at ${company}`,
        `<h2>Hi ${user.firstName},</h2><p>Your application to <strong>${jobTitle}</strong> at <strong>${company}</strong> has been submitted successfully via AI Job Platform.</p><p>We'll notify you of any updates!</p>`,
      );
    }

    return notification;
  }

  async notifyNeedsReview(userId: string, automationLogId: string, jobTitle: string, company: string) {
    return this.createNotification(
      userId,
      'APPLICATION_STATUS_CHANGE',
      'Application Ready for Review',
      `Your application to ${jobTitle} at ${company} is ready for your final review before submission.`,
      { automationLogId, jobTitle, company },
    );
  }

  async notifySessionExpired(userId: string, platformName: string, errorDetail?: string) {
    const title = `${platformName} Session Expired`;
    const body = `Your ${platformName} session has expired. Re-run the Windows login script to refresh cookies so automation can continue.`;

    const notification = await this.createNotification(
      userId,
      'SYSTEM_ALERT' as NotificationType,
      title,
      body,
      { platformName, errorDetail },
    );

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    if (user) {
      await this.sendEmailNotification(
        user.email,
        title,
        `<h2>Hi ${user.firstName},</h2>
<p>Your <strong>${platformName}</strong> session has expired and job automation has paused.</p>
<p><strong>What happened:</strong> ${errorDetail || 'Authentication failed — session cookies are no longer valid.'}</p>
<h3>To resume automation:</h3>
<ol>
  <li>On your Windows machine, run: <code>node C:\\tmp\\${platformName.toLowerCase()}-login.mjs</code></li>
  <li>This will log in and inject fresh cookies automatically.</li>
  <li>Automation will resume on the next queue cycle.</li>
</ol>
<p>If you keep seeing this, check that your ${platformName} password hasn't changed.</p>`,
      );
    }

    return notification;
  }
}
