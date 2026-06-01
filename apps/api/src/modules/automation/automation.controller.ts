import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe, Sse, Req, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { StartAutomationDto } from './dto/start-automation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsageLimitGuard, CheckUsageLimit } from '../../common/guards/usage-limit.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, merge, interval, map, takeUntil, filter } from 'rxjs';
import { Request } from 'express';
import { prisma } from '@ai-job/database';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('start')
  @UseGuards(UsageLimitGuard)
  @CheckUsageLimit('applications')
  @ApiOperation({ summary: 'Start automated job application' })
  startAutoApply(@CurrentUser('id') userId: string, @Body() dto: StartAutomationDto) {
    return this.automationService.startAutoApply(userId, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get automation history' })
  getLogs(@CurrentUser('id') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.automationService.getAutomationLogs(userId, +page, +limit);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get automation log status' })
  getStatus(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.getAutomationStatus(userId, id);
  }

  @Post('logs/:id/submit')
  @ApiOperation({ summary: 'Submit a reviewed application (semi-auto mode)' })
  submitReviewed(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.submitReviewedApplication(userId, id);
  }

  @Delete('logs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a queued/running automation' })
  cancel(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.cancelAutomation(userId, id);
  }

  @Sse('logs/:id/stream')
  @ApiOperation({ summary: 'Stream live automation log status via SSE' })
  streamStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) logId: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    // Heartbeat every 15s to keep connection alive through proxies
    const heartbeat$ = interval(15000).pipe(
      map(() => ({ data: { type: 'heartbeat' } } as MessageEvent)),
    );

    // Real automation events from EventEmitter2
    const statusEvents$ = new Observable<MessageEvent>((subscriber) => {
      const handler = async (payload: any) => {
        if (payload.automationLogId !== logId) return;
        const log = await prisma.automationLog.findFirst({
          where: { id: logId, userId },
          select: { status: true, currentStep: true, errorMessage: true, screenshotUrls: true, completedAt: true },
        });
        if (log) subscriber.next({ data: { type: 'update', ...log } } as MessageEvent);
        if (log?.status === 'COMPLETED' || log?.status === 'FAILED') subscriber.complete();
      };

      const events = ['automation.needs-review', 'automation.completed', 'automation.failed', 'application.submitted'];
      events.forEach((e) => this.eventEmitter.on(e, handler));
      req.on('close', () => {
        events.forEach((e) => this.eventEmitter.off(e, handler));
        subscriber.complete();
      });
    });

    // Emit current status immediately so client doesn't wait for an event
    const initial$ = new Observable<MessageEvent>((subscriber) => {
      prisma.automationLog.findFirst({
        where: { id: logId, userId },
        select: { status: true, currentStep: true, errorMessage: true, screenshotUrls: true },
      }).then((log) => {
        if (log) subscriber.next({ data: { type: 'update', ...log } } as MessageEvent);
        subscriber.complete();
      }).catch(() => subscriber.complete());
    });

    return merge(initial$, statusEvents$, heartbeat$);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  queueStats() {
    return this.automationService.getQueueStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get automation performance analytics' })
  getAnalytics(@CurrentUser('id') userId: string) {
    return this.automationService.getAutomationAnalytics(userId);
  }

  @Get('queue/failed')
  @ApiOperation({ summary: 'List failed queue jobs (admin/debug)' })
  failedJobs(@Query('limit') limit = 20) {
    return this.automationService.getFailedQueueJobs(+limit);
  }
}
