'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap, FileText, Link2, Cpu, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UsageMeterProps {
  compact?: boolean;
}

function MeterBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70;
  const barColor = danger ? 'bg-red-500' : warn ? 'bg-amber-500' : color;
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export function UsageMeter({ compact = false }: UsageMeterProps) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.get('/users/usage').then((r) => r.data.data),
    staleTime: 60_000,
  });

  if (isLoading || !usage) {
    return (
      <div className="rounded-2xl border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-muted rounded mb-2" />)}
      </div>
    );
  }

  const appPct = usage.applications.limit > 0
    ? Math.round((usage.applications.used / usage.applications.limit) * 100)
    : 0;
  const nearLimit = appPct >= 80;
  const atLimit = appPct >= 100;

  const items = [
    { label: 'Applications', icon: Zap, used: usage.applications.used, limit: usage.applications.limit, color: 'bg-brand-500' },
    { label: 'Resume Uploads', icon: FileText, used: usage.resumeUploads.used, limit: usage.resumeUploads.limit, color: 'bg-purple-500' },
    { label: 'AI Optimizations', icon: Cpu, used: usage.aiOptimizations.used, limit: usage.aiOptimizations.limit, color: 'bg-green-500' },
    { label: 'Platforms', icon: Link2, used: usage.platformConnections.used, limit: usage.platformConnections.limit, color: 'bg-orange-500' },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Applications</span>
            <span className={atLimit ? 'text-red-500 font-semibold' : nearLimit ? 'text-amber-500' : ''}>
              {usage.applications.used}/{usage.applications.limit}
            </span>
          </div>
          <MeterBar used={usage.applications.used} limit={usage.applications.limit} color="bg-brand-500" />
        </div>
        {nearLimit && usage.plan === 'FREE' && (
          <Link href="/settings?tab=billing" className="flex items-center gap-1 text-xs text-brand-600 font-semibold whitespace-nowrap hover:underline">
            Upgrade <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Usage This Month</h3>
          <span className="text-xs text-muted-foreground capitalize">{usage.plan} plan</span>
        </div>
        {usage.plan === 'FREE' && (
          <Link
            href="/settings?tab=billing"
            className="flex items-center gap-1 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Upgrade <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {atLimit && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          Monthly limit reached. <Link href="/settings?tab=billing" className="font-semibold underline">Upgrade to continue applying.</Link>
        </div>
      )}
      {!atLimit && nearLimit && usage.plan === 'FREE' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          {usage.applications.limit - usage.applications.used} applications remaining. <Link href="/settings?tab=billing" className="font-semibold underline">Upgrade for unlimited.</Link>
        </div>
      )}

      <div className="space-y-4">
        {items.map(({ label, icon: Icon, used, limit, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <span className="text-xs font-medium">{used} / {limit === 999999 ? '∞' : limit}</span>
            </div>
            <MeterBar used={used} limit={limit === 999999 ? 1 : limit} color={color} />
          </div>
        ))}
      </div>

      {usage.applications.resetDate && (
        <p className="text-xs text-muted-foreground mt-4">
          Resets on {new Date(usage.applications.resetDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  );
}
