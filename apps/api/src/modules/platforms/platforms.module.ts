import { Module } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';
import { ConnectorRegistry } from './connector.registry';
import { BrowserSemaphoreService } from './browser-semaphore.service';

@Module({
  controllers: [PlatformsController],
  providers: [PlatformsService, ConnectorRegistry, BrowserSemaphoreService],
  exports: [PlatformsService, ConnectorRegistry, BrowserSemaphoreService],
})
export class PlatformsModule {}
