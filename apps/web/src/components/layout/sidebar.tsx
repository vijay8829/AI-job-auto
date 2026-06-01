'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, Search, ClipboardList,
  BarChart2, Settings, Plug, Bot, LogOut, Zap,
  Activity, ChevronRight, Sparkles, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, color: 'purple', badge: null },
  { href: '/resume',       label: 'Resume',       icon: FileText,        color: 'cyan',   badge: null },
  { href: '/jobs',         label: 'Job Feed',     icon: Search,          color: 'green',  badge: 'jobs' },
  { href: '/applications', label: 'Applications', icon: ClipboardList,   color: 'purple', badge: null },
  { href: '/automation',   label: 'Automation',   icon: Activity,        color: 'cyan',   badge: 'live' },
  { href: '/analytics',    label: 'Analytics',    icon: BarChart2,       color: 'green',  badge: null },
  { href: '/integrations', label: 'Integrations', icon: Plug,            color: 'purple', badge: null },
  { href: '/settings',     label: 'Settings',     icon: Settings,        color: 'cyan',   badge: null },
];

const colorMap: Record<string, { active: string; icon: string; glow: string }> = {
  purple: {
    active: 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple',
    icon:   'text-neon-purple',
    glow:   'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
  },
  cyan: {
    active: 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan',
    icon:   'text-neon-cyan',
    glow:   'shadow-[0_0_12px_rgba(34,211,238,0.3)]',
  },
  green: {
    active: 'bg-neon-green/10 border-neon-green/30 text-neon-green',
    icon:   'text-neon-green',
    glow:   'shadow-[0_0_12px_rgba(52,211,153,0.3)]',
  },
};

function SidebarUsageMeter() {
  const { data: profile } = useQuery({
    queryKey: ['usage-limits'],
    queryFn: () => api.get('/users/profile').then((r) => r.data.data?.usageLimits),
    staleTime: 60_000,
    retry: false,
  });

  if (!profile) return null;

  const meters = [
    { label: 'Applications', used: profile.applicationsThisMonth ?? 0, limit: profile.applicationsLimit ?? 10, from: '#a855f7', to: '#22d3ee' },
    { label: 'AI Credits',   used: profile.aiOptimizationsUsed ?? 0,   limit: profile.aiOptimizationsLimit ?? 3, from: '#22d3ee', to: '#34d399' },
  ];

  const planLabel = (profile as any)?.plan ?? 'FREE';
  const nearLimit = meters.some((m) => m.used / Math.max(m.limit, 1) >= 0.8);

  return (
    <div className="px-3 pb-2">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Usage</span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-bold border',
            planLabel === 'PRO' ?
              'bg-neon-purple/10 text-neon-purple border-neon-purple/30' :
            planLabel === 'ENTERPRISE' ?
              'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' :
              'bg-white/5 text-white/40 border-white/10'
          )}>
            {planLabel}
          </span>
        </div>

        {meters.map(({ label, used, limit, from, to }) => {
          const pct = Math.min((used / Math.max(limit, 1)) * 100, 100);
          const critical = pct >= 80;
          return (
            <div key={label}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-white/50">{label}</span>
                <span className={cn('text-[11px] font-bold tabular-nums', critical ? 'text-amber-400' : 'text-white/60')}>
                  {used}<span className="text-white/30">/{limit}</span>
                </span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                />
              </div>
            </div>
          );
        })}

        {nearLimit && (
          <Link href="/pricing" className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}>
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
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full border-r border-white/[0.06]"
      style={{ background: 'rgba(10,9,20,0.97)', backdropFilter: 'blur(20px)' }}>

      {/* Neural grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Logo */}
      <div className="relative px-4 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #22d3ee 100%)' }}>
              <Bot className="w-5 h-5 text-white relative z-10" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }} />
            </div>
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full border-2"
              style={{ borderColor: 'rgba(10,9,20,0.97)' }}
            />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #22d3ee)' }}>
              AI Job Platform
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-2.5 h-2.5 text-neon-green" />
              <p className="text-[10px] text-white/40">AI-Powered · Secure</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 mb-2 mt-1">Navigation</p>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const c = colorMap[item.color];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group border',
                active
                  ? cn(c.active, c.glow)
                  : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.04] hover:border-white/[0.06]',
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(34,211,238,0.04))' }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                />
              )}
              <item.icon className={cn('w-4 h-4 relative z-10 transition-colors', active ? c.icon : 'text-white/30 group-hover:text-white/60')} />
              <span className="relative z-10 flex-1">{item.label}</span>
              {item.badge === 'live' && <LiveAutomationDot />}
              {active && !item.badge && (
                <ChevronRight className={cn('w-3 h-3 relative z-10', c.icon)} />
              )}
            </Link>
          );
        })}

        {/* AI Status chip */}
        <div className="mt-4 mx-1 p-3 rounded-xl border border-neon-purple/20 bg-neon-purple/5">
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-neon-purple"
            />
            <span className="text-[10px] font-bold text-neon-purple uppercase tracking-widest">AI Agent Active</span>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed">Scanning job boards · Matching profiles · Optimizing resumes</p>
        </div>
      </nav>

      {/* Usage meters */}
      <SidebarUsageMeter />

      {/* User */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all duration-150 group border border-transparent hover:border-white/[0.06]">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full border-2"
              style={{ borderColor: 'rgba(10,9,20,0.97)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-white/80">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="w-3.5 h-3.5 text-white/30 hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
}
