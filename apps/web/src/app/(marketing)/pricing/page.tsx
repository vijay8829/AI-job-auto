'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Zap, Building2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Perfect for getting started',
    color: 'border-border',
    badge: null,
    features: [
      '3 job applications per month',
      '1 resume upload',
      'Job search across 7 platforms',
      'AI job matching (top 10 results)',
      'Application tracking',
      'Email notifications',
    ],
    cta: 'Get started free',
    ctaStyle: 'border border-border hover:bg-accent',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: { monthly: 29, yearly: 19 },
    icon: <Zap className="w-5 h-5" />,
    description: 'For active job seekers',
    color: 'border-primary',
    badge: 'Most popular',
    features: [
      '50 job applications per month',
      '5 resume uploads',
      'Full AI-powered matching',
      'Resume tailoring per application',
      'AI cover letter generation',
      'Semi-auto apply (review before submit)',
      'ATS score optimization',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Pro trial',
    ctaStyle: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: { monthly: 99, yearly: 79 },
    icon: <Building2 className="w-5 h-5" />,
    description: 'For power users & teams',
    color: 'border-purple-500/50',
    badge: 'Best value',
    features: [
      'Unlimited job applications',
      'Unlimited resume uploads',
      'Full auto-apply (no review needed)',
      'Priority AI processing',
      'Custom job platform connectors',
      'Team dashboard (up to 5 users)',
      'Dedicated account manager',
      'API access',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Start Enterprise trial',
    ctaStyle:
      'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90',
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const { user } = useAuthStore();

  const { mutate: checkout, isPending } = useMutation({
    mutationFn: (planId: string) =>
      api
        .post('/subscriptions/checkout', { planId, interval: yearly ? 'year' : 'month' })
        .then((r) => r.data.data),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => toast.error('Failed to start checkout'),
  });

  const handleCta = (planId: string) => {
    if (planId === 'FREE') {
      window.location.href = user ? '/dashboard' : '/signup';
      return;
    }
    if (!user) {
      window.location.href = '/signup';
      return;
    }
    checkout(planId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-foreground">
            AI Job Platform
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the plan that fits your job search. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl border border-border bg-muted/30">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !yearly
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                yearly
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600 font-semibold">
                Save 35%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border-2 ${plan.color} bg-card p-8 ${
                plan.id === 'PRO' ? 'shadow-lg shadow-primary/10 scale-105' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    plan.id === 'FREE'
                      ? 'bg-muted text-muted-foreground'
                      : plan.id === 'PRO'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-purple-500/10 text-purple-600'
                  }`}
                >
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    ${yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                {yearly && plan.price.monthly > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed annually (${plan.price.yearly * 12}/year)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCta(plan.id)}
                disabled={isPending}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${plan.ctaStyle}`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Frequently asked questions
          </h2>

          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. You can cancel your subscription at any time from the billing settings. You keep access until the end of your billing period.',
            },
            {
              q: 'How does auto-apply work?',
              a: 'Our browser automation fills in your application form using your resume and profile data. In semi-auto mode (Pro), you review before submitting. Enterprise users can enable full automation.',
            },
            {
              q: 'Which job platforms are supported?',
              a: 'LinkedIn, Indeed, Naukri, Glassdoor, Wellfound, Greenhouse, and Lever. More platforms are added regularly.',
            },
            {
              q: 'Is my data secure?',
              a: 'All platform credentials are AES-encrypted at rest. We never store passwords in plain text. All traffic is encrypted via HTTPS/TLS.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="py-4 border-b border-border">
              <h3 className="font-semibold text-foreground mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
