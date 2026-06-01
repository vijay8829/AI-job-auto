'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, Search, ClipboardList,
  BarChart2, Settings, Plug, Bot, LogOut, Zap,
  Activity, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, badge: null },
  { href: '/resume',       label: 'Resume',       icon: FileText,        badge: null },
  { href: '/jobs',         label: 'Job Feed',     icon: Search,          badge: 'jobs' },
  { href: '/applications', label: 'Applications', icon: ClipboardList,   badge: null },
  { href: '/automation',   label: 'Automation',   icon: Activity,        badge: 'live' },
  { href: '/analytics',    label: 'Analytics',    icon: BarChart2,       badge: null },
  { href: '/integrations', label: 'Integrations', icon: Plug,            badge: null },
  { href: '/settings',     label: 'Settings',     icon: Settings,        badge: null },
];

function SidebarUsageMeter() {
  const { data: profile } = useQuery({
    queryKey: ['usage-limits'],
    queryFn: () => api.get('/users/profile').then((r) => r.data.data?.usageLimits),
    staleTime: 60_000,
    retry: false,
  });

  if (!profile) return null;

  const meters = [
    { label: 'Applications', used: profile.applicationsThisMonth ?? 0, limit: profile.applicationsLimit ?? 10, color: 'bg-brand-500' },
    { label: 'AI Credits',   used: profile.aiOptimizationsUsed ?? 0,   limit: profile.aiOptimizationsLimit ?? 3, color: 'bg-purple-500' },
  ];

  const planLabel = (profile as any)?.plan ?? 'FREE';
  const nearLimit = meters.some((m) => m.used / Math.max(m.limit, 1) >= 0.8);

  return (
    <div className="px-3 pb-2">
      <div className={cn(
        'rounded-xl border p-3 space-y-2.5 transition-all',
        nearLimit ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30' : 'bg-muted/40',
      )}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-md font-semibold',
            planLabel === 'PRO' ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' :
            planLabel === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
            'bg-muted text-muted-foreground'
          )}>
            {planLabel}
          </span>
        </div>

        {meters.map(({ label, used, limit, color }) => {
          const pct = Math.min((used / Math.max(limit, 1)) * 100, 100);
          const critical = pct >= 80;
          return (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={cn('text-xs font-semibold tabular-nums', critical ? 'text-amber-500' : 'text-foreground')}>
                  {used}/{limit}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', critical ? 'bg-amber-500' : color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
          );
        })}

        {nearLimit && (
          <Link href="/pricing" className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Sparkles className="w-3 h-3" />
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}

function LiveAutomationDot() {
  const { data } = useQuery({
    queryKey: ['automation-live-count'],
    queryFn: () => api.get('/automation/logs?status=RUNNING&limit=1').then((r) => {
      const logs = r.data.data;
      return Array.isArray(logs) ? logs.length : 0;
    }),
    refetchInterval: 15000,
    retry: false,
  });

  if (!data) return null;
  return (
    <span className="relative flex h-2 w-2 ml-auto">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <div className="w-9 h-9 gradient-brand-rich rounded-xl flex items-center justify-center shadow-md group-hover:shadow-glow-sm transition-all duration-300">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight gradient-text">AI Job Platform</p>
            <p className="text-xs text-muted-foreground">Automate your search</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-brand-50 dark:bg-brand-950/60 rounded-xl border border-brand-100 dark:border-brand-900/50"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon className={cn('w-4 h-4 relative z-10 transition-colors', active ? 'text-brand-600 dark:text-brand-400' : 'group-hover:text-foreground')} />
              <span className="relative z-10 flex-1">{item.label}</span>
              {item.badge === 'live' && <LiveAutomationDot />}
              {active && !item.badge && <ChevronRight className="w-3 h-3 relative z-10 text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Usage meters */}
      <SidebarUsageMeter />

      {/* User */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/80 cursor-pointer transition-all duration-150 group">
          <div className="relative shrink-0">
            <div className="w-8 h-8 gradient-brand-rich rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
}
