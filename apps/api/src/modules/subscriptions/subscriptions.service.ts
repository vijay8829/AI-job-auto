import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { prisma } from '@ai-job/database';

const PLAN_LIMITS = {
  FREE: { applicationsLimit: 10, aiOptimizationsLimit: 3, resumeUploadsLimit: 2, platformConnectionsLimit: 2 },
  PRO: { applicationsLimit: 500, aiOptimizationsLimit: 100, resumeUploadsLimit: 20, platformConnectionsLimit: 10 },
  ENTERPRISE: { applicationsLimit: 99999, aiOptimizationsLimit: 99999, resumeUploadsLimit: 99999, platformConnectionsLimit: 99999 },
};

@Injectable()
export class SubscriptionsService {
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null;
  }

  private getStripe(): Stripe {
    if (!this.stripe) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    return this.stripe;
  }

  async createCheckoutSession(userId: string, plan: 'PRO' | 'ENTERPRISE') {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
    if (!user) throw new NotFoundException('User not found');

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.getStripe().customers.create({ email: user.email, name: `${user.firstName} ${user.lastName}`, metadata: { userId } });
      customerId = customer.id;
    }

    const priceId = plan === 'PRO'
      ? this.config.getOrThrow('STRIPE_PRO_PRICE_ID')
      : this.config.getOrThrow('STRIPE_ENTERPRISE_PRICE_ID');

    const session = await this.getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${this.config.get('APP_URL')}/settings/billing?success=true`,
      cancel_url: `${this.config.get('APP_URL')}/settings/billing?cancelled=true`,
      metadata: { userId, plan },
    });

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeCustomerId) throw new NotFoundException('No billing account found');

    const session = await this.getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.config.get('APP_URL')}/settings/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
    const event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  async getSubscription(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { email: true, firstName: true } } },
    });
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const { userId, plan } = session.metadata as { userId: string; plan: 'PRO' | 'ENTERPRISE' };
    const stripeSubscription = await this.getStripe().subscriptions.retrieve(session.subscription as string);
    const limits = PLAN_LIMITS[plan];

    await Promise.all([
      prisma.subscription.upsert({
        where: { userId },
        create: {
          userId, plan: plan as any, status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0].price.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
        update: {
          plan: plan as any, status: 'ACTIVE',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0].price.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
      }),
      prisma.usageLimit.upsert({
        where: { userId },
        create: { userId, ...limits, resetDate: new Date(stripeSubscription.current_period_end * 1000) },
        update: { ...limits },
      }),
    ]);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (!sub) return;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: subscription.status.toUpperCase().replaceAll('-', '_') as any,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (!sub) return;

    await Promise.all([
      prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED', plan: 'FREE', cancelledAt: new Date() } }),
      prisma.usageLimit.update({ where: { userId: sub.userId }, data: PLAN_LIMITS.FREE }),
    ]);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
    if (sub) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } });
    }
  }
}
