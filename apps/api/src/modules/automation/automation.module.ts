import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutoApplyProcessor } from './processors/auto-apply.processor';
import { DlqMonitorService } from './dlq-monitor.service';
import { PlatformsModule } from '../platforms/platforms.module';
import { BrowserSemaphoreService } from '../platforms/browser-semaphore.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'auto-apply',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: false,
      },
    }),
    PlatformsModule,
    NotificationsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutoApplyProcessor, DlqMonitorService],
  exports: [AutomationService],
})
export class AutomationModule {}
