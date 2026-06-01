import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@ai-job/database';
import { ConnectorRegistry } from '../../platforms/connector.registry';
import { PlatformsService } from '../../platforms/platforms.service';
import { BrowserSemaphoreService } from '../../platforms/browser-semaphore.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Processor('auto-apply')
export class AutoApplyProcessor {
  private readonly logger = new Logger(AutoApplyProcessor.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly platformsService: PlatformsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
    private readonly browserSemaphore: BrowserSemaphoreService,
    private readonly notificationsService: NotificationsService,
  ) {
    const endpoint = config.get<string>('AWS_ENDPOINT');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET', 'ai-job-platform-resumes');
    this.publicUrl = config.get('AWS_PUBLIC_URL', 'http://localhost:9000');
  }

  @Process('apply-to-job')
  async applyToJob(job: Job<{
    automationLogId: string;
    applicationId: string;
    userId: string;
    jobId: string;
    platformName: string;
    platformAccountId: string;
    jobUrl: string;
    applyUrl: string;
    resumeId: string;
    resumeUrl: string;
    coverLetter?: string;
    answers?: Record<string, string>;
    mode: 'SEMI_AUTO' | 'FULL_AUTO';
  }>) {
    const { automationLogId, userId, platformName, platformAccountId, resumeUrl, coverLetter, answers, mode } = job.data;

    await prisma.automationLog.update({
      where: { id: automationLogId },
      data: { status: 'RUNNING', startedAt: new Date(), currentStep: 'Initializing' },
    });

    const connector = this.connectorRegistry.getConnector(platformName);
    if (!connector) {
      await this.failAutomation(automationLogId, `No connector for platform: ${platformName}`);
      return;
    }

    const platformAccount = await prisma.platformAccount.findUnique({
      where: { id: platformAccountId },
    });
    if (!platformAccount) {
      await this.failAutomation(automationLogId, 'Platform account not found');
      return;
    }

    let tempResumePath: string | null = null;

    // Acquire a browser slot — queues if BROWSER_POOL_SIZE concurrency limit is reached
    const releaseBrowserSlot = await this.browserSemaphore.acquire();

    try {
      // Initialize connector with saved session
      await connector.initialize(platformAccount);
      this.logger.log(`Connector initialized for ${platformName}`);

      // Check/restore session
      const sessionValid = await connector.isSessionValid();
      if (!sessionValid && platformAccount.encryptedCredentials) {
        const credentials = this.platformsService.decryptCredentials(platformAccount.encryptedCredentials);
        const loginSuccess = await connector.login(credentials);
        if (!loginSuccess) {
          await this.failAutomation(automationLogId, 'Login failed - credentials may be outdated');
          await prisma.platformAccount.update({ where: { id: platformAccountId }, data: { status: 'AUTH_FAILED' } });
          return;
        }
        // Persist fresh session cookies so next run skips login
        const freshCookies = await connector.exportSessionCookies?.();
        if (freshCookies) {
          await prisma.platformAccount.update({
            where: { id: platformAccountId },
            data: { cookieData: freshCookies, status: 'ACTIVE', syncError: null },
          });
        }
      }

      await prisma.automationLog.update({ where: { id: automationLogId }, data: { currentStep: 'Downloading resume' } });

      // Download resume to temp file
      tempResumePath = await this.downloadResume(resumeUrl);

      // Get user profile for form filling
      const userProfile = await this.getUserProfile(userId);

      await prisma.automationLog.update({ where: { id: automationLogId }, data: { currentStep: 'Filling application' } });

      const applyTimeoutMs = this.config.get<number>('APPLY_TIMEOUT_MS', 180000); // 3 min default
      const result = await connector.withTimeout(
        connector.applyToJob({
          jobUrl: job.data.applyUrl,
          resumeFilePath: tempResumePath,
          coverLetter,
          answers,
          userProfile,
        }),
        applyTimeoutMs,
        `applyToJob on ${platformName}`,
      );

      // Upload screenshots to MinIO (avoid storing base64 blobs in Postgres)
      const screenshotUrls = await this.uploadScreenshots(result.screenshots, userId, automationLogId);

      // Always persist updated cookies after any successful browser session
      const updatedCookies = await connector.exportSessionCookies?.();
      if (updatedCookies) {
        await prisma.platformAccount.update({
          where: { id: platformAccountId },
          data: { cookieData: updatedCookies },
        });
      }

      if (result.applicationId === 'pending-review') {
        // SEMI-AUTO: pause and wait for user review
        await prisma.automationLog.update({
          where: { id: automationLogId },
          data: {
            status: 'NEEDS_REVIEW',
            completedSteps: result.steps.length,
            totalSteps: result.steps.length + 1,
            screenshotUrls,
            steps: result.steps,
            sessionData: { connector: platformName },
            currentStep: 'Awaiting user review',
          },
        });

        this.eventEmitter.emit('automation.needs-review', { userId, automationLogId });
        this.logger.log(`Application ready for review: ${automationLogId}`);
      } else if (result.success) {
        await this.completeAutomation(automationLogId, userId, job.data.applicationId, result.steps, screenshotUrls);
      } else {
        await this.failAutomation(automationLogId, result.error || 'Application failed', userId);
      }

    } catch (error) {
      this.logger.error(`Auto-apply failed: ${error.message}`);
      await this.failAutomation(automationLogId, error.message, userId);
    } finally {
      await connector.cleanup?.();
      if (tempResumePath) await fs.unlink(tempResumePath).catch(() => {});
      releaseBrowserSlot();
    }
  }

  @Process('submit-application')
  async submitApplication(job: Job<{ automationLogId: string; userId: string; sessionData: any }>) {
    const { automationLogId, userId } = job.data;

    const log = await prisma.automationLog.findFirst({
      where: { id: automationLogId, userId },
      include: { applications: { include: { job: true, resume: true } } },
    });
    if (!log) {
      this.logger.error(`submit-application: log ${automationLogId} not found`);
      return;
    }

    const application = log.applications[0];
    if (!application) {
      await this.failAutomation(automationLogId, 'No application linked to this automation log');
      return;
    }

    const platformAccount = await prisma.platformAccount.findFirst({
      where: { userId, platformId: log.platformId!, isActive: true },
    });
    if (!platformAccount) {
      await this.failAutomation(automationLogId, 'Platform account not found — reconnect the platform');
      return;
    }

    const platformName = (job.data.sessionData as any)?.connector || '';
    const connector = this.connectorRegistry.getConnector(platformName);
    if (!connector) {
      // For platforms where the apply action is already done (e.g. Naukri redirect), just mark complete
      await this.completeAutomation(automationLogId, userId, application.id, [], []);
      return;
    }

    const releaseBrowserSlot = await this.browserSemaphore.acquire();
    let tempResumePath: string | null = null;

    try {
      await connector.initialize(platformAccount);

      const sessionValid = await connector.isSessionValid();
      if (!sessionValid && platformAccount.encryptedCredentials) {
        const credentials = this.platformsService.decryptCredentials(platformAccount.encryptedCredentials);
        const ok = await connector.login(credentials);
        if (!ok) {
          await this.failAutomation(automationLogId, 'Login failed during final submission');
          return;
        }
      }

      await prisma.automationLog.update({
        where: { id: automationLogId },
        data: { status: 'RUNNING', currentStep: 'Submitting application' },
      });

      const resumeUrl = application.resume?.fileUrl;
      if (!resumeUrl) {
        await this.failAutomation(automationLogId, 'Resume file not found for submission');
        return;
      }

      tempResumePath = await this.downloadResume(resumeUrl);
      const userProfile = await this.getUserProfile(userId);
      const applyUrl = application.job.applyUrl || application.job.externalUrl;

      const applyTimeoutMs = this.config.get<number>('APPLY_TIMEOUT_MS', 180000);
      const result = await connector.withTimeout(
        connector.applyToJob({
          jobUrl: applyUrl,
          resumeFilePath: tempResumePath,
          coverLetter: application.coverLetter ?? undefined,
          answers: {},
          userProfile,
          allowSubmit: true,
        }),
        applyTimeoutMs,
        `submitApplication on ${platformName}`,
      );

      const screenshotUrls = await this.uploadScreenshots(result.screenshots, userId, automationLogId);

      const updatedCookies = await connector.exportSessionCookies?.();
      if (updatedCookies) {
        await prisma.platformAccount.update({
          where: { id: platformAccount.id },
          data: { cookieData: updatedCookies },
        });
      }

      if (result.success) {
        await this.completeAutomation(automationLogId, userId, application.id, result.steps, screenshotUrls);
      } else {
        await this.failAutomation(automationLogId, result.error || 'Submission failed', userId);
      }
    } catch (error: any) {
      this.logger.error(`submit-application failed: ${error.message}`);
      await this.failAutomation(automationLogId, error.message, userId);
    } finally {
      await connector.cleanup?.();
      if (tempResumePath) await fs.unlink(tempResumePath).catch(() => {});
      releaseBrowserSlot();
    }
  }

  private async completeAutomation(
    automationLogId: string, userId: string, applicationId: string,
    steps: any[], screenshotUrls: string[],
  ) {
    const startTime = (await prisma.automationLog.findUnique({ where: { id: automationLogId } }))?.startedAt;
    const durationMs = startTime ? Date.now() - startTime.getTime() : 0;

    await Promise.all([
      prisma.automationLog.update({
        where: { id: automationLogId },
        data: { status: 'COMPLETED', completedAt: new Date(), durationMs, steps, screenshotUrls, currentStep: 'Submitted' },
      }),
      prisma.application.update({
        where: { id: applicationId },
        data: { status: 'APPLIED', appliedAt: new Date() },
      }),
    ]);

    // Usage tracking is best-effort — failure must not roll back a completed application
    prisma.usageLimit.update({
      where: { userId },
      data: { applicationsThisMonth: { increment: 1 } },
    }).catch((err: any) => this.logger.warn(`Usage tracking failed for ${userId}: ${err.message}`));

    this.eventEmitter.emit('application.submitted', { userId, applicationId, automationLogId });
  }

  private async failAutomation(automationLogId: string, errorMessage: string, userId?: string) {
    const log = await prisma.automationLog.update({
      where: { id: automationLogId },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage },
      include: { applications: { include: { job: true } } },
    });
    this.logger.error(`Automation ${automationLogId} failed: ${errorMessage}`);

    if (!userId) return;

    const isCaptcha = /captcha/i.test(errorMessage);
    const isAuthFailed = /auth.*fail|session.*expir|login.*fail|not.*logged/i.test(errorMessage);
    const jobTitle = log.applications[0]?.job?.title || 'a job';
    const company = log.applications[0]?.job?.company || '';

    if (isCaptcha) {
      this.notificationsService.createNotification(
        userId,
        'SYSTEM_ALERT' as any,
        'CAPTCHA detected — manual action needed',
        `Automation for ${jobTitle}${company ? ` at ${company}` : ''} was blocked by a CAPTCHA. Open the job link and complete it manually, then re-trigger.`,
        { automationLogId, jobTitle, company, reason: 'captcha' },
      ).catch(() => {});
    } else if (isAuthFailed) {
      const platform = log.applications[0]?.job?.platform?.name || 'the platform';
      this.notificationsService.notifySessionExpired(userId, platform, errorMessage).catch(() => {});
    }
  }

  private async uploadScreenshots(base64Images: string[], userId: string, logId: string): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      const b64 = base64Images[i];
      if (!b64) continue;
      try {
        const buffer = Buffer.from(b64, 'base64');
        const key = `screenshots/${userId}/${logId}/step_${i + 1}_${uuidv4()}.png`;
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
        }));
        urls.push(`${this.publicUrl}/${this.bucket}/${key}`);
      } catch (err: any) {
        this.logger.warn(`Failed to upload screenshot ${i}: ${err.message}`);
      }
    }
    return urls;
  }

  private async downloadResume(url: string, retries = 3): Promise<string> {
    let lastError: any;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        const ext = url.includes('.pdf') ? '.pdf' : '.docx';
        const tempPath = path.join(os.tmpdir(), `resume_${Date.now()}${ext}`);
        await fs.writeFile(tempPath, Buffer.from(response.data));
        return tempPath;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Resume download attempt ${attempt}/${retries} failed: ${err.message}`);
        if (attempt < retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    throw new Error(`Failed to download resume after ${retries} attempts: ${lastError?.message}`);
  }

  private async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    return {
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phone: user?.profile?.phone,
      location: user?.profile?.location,
      linkedinUrl: user?.profile?.linkedinUrl,
      portfolioUrl: user?.profile?.portfolioUrl,
    };
  }
}
