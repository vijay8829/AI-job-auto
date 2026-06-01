import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@ai-job/database';
import { ConnectorRegistry } from '../../platforms/connector.registry';
import { PlatformsService } from '../../platforms/platforms.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('job-scraping')
export class JobScrapingProcessor {
  private readonly logger = new Logger(JobScrapingProcessor.name);

  constructor(
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly eventEmitter: EventEmitter2,
    private readonly platformsService: PlatformsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process('scrape-jobs')
  async scrapeJobs(
    job: Job<{ userId: string; platformId: string; platformName: string; searchParams: any }>,
  ) {
    const { userId, platformId, platformName, searchParams } = job.data;
    this.logger.log(`Scraping jobs from ${platformName} for user ${userId}`);

    const connector = this.connectorRegistry.getConnector(platformName);
    if (!connector) {
      this.logger.warn(`No connector found for platform: ${platformName}`);
      return;
    }

    const platformAccount = await prisma.platformAccount.findFirst({
      where: { userId, platformId, isActive: true },
    });

    if (!platformAccount) {
      this.logger.warn(`No active account for platform ${platformName}`);
      return;
    }

    try {
      await connector.initialize(platformAccount);

      // Check if stored session cookies are still valid; if not, login fresh
      const sessionValid = await connector.isSessionValid();
      if (!sessionValid) {
        if (!platformAccount.encryptedCredentials) {
          this.logger.warn(`No credentials stored for ${platformName} account — skipping`);
          await connector.cleanup?.();
          return;
        }

        const creds = this.platformsService.decryptCredentials(platformAccount.encryptedCredentials);
        this.logger.log(`Logging into ${platformName} as ${platformAccount.username}`);
        const loginOk = await connector.login({ username: creds.username, password: creds.password });

        if (!loginOk) {
          this.logger.error(`Login failed for ${platformName}`);
          await prisma.platformAccount.update({
            where: { id: platformAccount.id },
            data: { syncError: 'Login failed — check credentials', status: 'AUTH_FAILED' },
          });
          await this.notificationsService.notifySessionExpired(userId, platformName, 'Login failed — check credentials or re-run the Windows login script.').catch(() => {});
          await connector.cleanup?.();
          return;
        }

        // Persist fresh cookies so next run can skip login
        if (connector.exportSessionCookies) {
          const cookieData = await connector.exportSessionCookies();
          if (cookieData) {
            await prisma.platformAccount.update({
              where: { id: platformAccount.id },
              data: { cookieData, status: 'ACTIVE', syncError: null },
            });
          }
        }
      }

      const scrapedJobs = await connector.searchJobs(searchParams);

      let saved = 0;
      for (const scrapedJob of scrapedJobs) {
        if (!scrapedJob.externalId || !scrapedJob.title) continue;
        try {
          await prisma.job.upsert({
            where: { platformId_externalId: { platformId, externalId: scrapedJob.externalId } },
            create: { ...scrapedJob, platformId },
            update: {
              title: scrapedJob.title,
              description: scrapedJob.description,
              requirements: scrapedJob.requirements,
              skills: scrapedJob.skills,
              status: 'ACTIVE',
              updatedAt: new Date(),
            },
          });
          saved++;
        } catch (err) {
          this.logger.error(`Failed to save job ${scrapedJob.externalId}: ${err.message}`);
        }
      }

      this.logger.log(`Saved ${saved}/${scrapedJobs.length} jobs from ${platformName}`);
      this.eventEmitter.emit('jobs.scraped', { userId, platformName, count: saved });

      await prisma.platformAccount.update({
        where: { id: platformAccount.id },
        data: { lastSyncAt: new Date(), syncError: null, status: 'ACTIVE' },
      });
    } catch (error) {
      this.logger.error(`Scraping failed for ${platformName}: ${error.message}`);
      await prisma.platformAccount.update({
        where: { id: platformAccount.id },
        data: { syncError: error.message, status: 'AUTH_FAILED' },
      });
      const isAuthError = /captcha|auth|session|login|cookie|block/i.test(error.message);
      if (isAuthError) {
        await this.notificationsService.notifySessionExpired(userId, platformName, error.message).catch(() => {});
      }
      throw error;
    } finally {
      await connector.cleanup?.();
    }
  }
}
