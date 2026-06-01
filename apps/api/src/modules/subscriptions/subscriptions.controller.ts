import { Controller, Get, Post, Body, Headers, RawBody, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getSubscription(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  checkout(@CurrentUser('id') userId: string, @Body('plan') plan: 'PRO' | 'ENTERPRISE') {
    return this.subscriptionsService.createCheckoutSession(userId, plan);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('portal')
  @ApiOperation({ summary: 'Create Stripe customer portal session' })
  portal(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.createPortalSession(userId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  webhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionsService.handleWebhook(payload, signature);
  }
}
