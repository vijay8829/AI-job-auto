import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobMatchingProcessor } from './processors/job-matching.processor';
import { JobScrapingProcessor } from './processors/job-scraping.processor';
import { PlatformsModule } from '../platforms/platforms.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'job-matching' }),
    BullModule.registerQueue({ name: 'job-scraping' }),
    PlatformsModule,
    NotificationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobMatchingProcessor, JobScrapingProcessor],
  exports: [JobsService],
})
export class JobsModule {}
