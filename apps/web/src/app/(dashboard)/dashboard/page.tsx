'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Briefcase, TrendingUp, CheckCircle2, Target, Zap, ArrowUpRight, Clock, Bot, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCard } from '@/components/jobs/job-card';

const STATUS_COLORS = {
  PENDING: '#94a3b8',
  APPLIED: '#3b82f6',
  INTERVIEW_SCHEDULED: '#8b5cf6',
  OFFER_RECEIVED: '#10b981',
  REJECTED: '#ef4444',
};

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === 'string' ? parseFloat(value) : value;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || isNaN(numVal)) return;
    let start = 0;
    const duration = 800;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numVal));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, numVal]);

  if (typeof value === 'string' && value.includes('%')) {
    return <span ref={ref}>{display}%</span>;
  }
  return <span ref={ref}>{display}{suffix}</span>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['app-stats'],
    queryFn: () => api.get('/applications/stats').then((r) => r.data.data),
  });

  const { data: timeline } = useQuery({
    queryKey: ['app-timeline'],
    queryFn: () => api.get('/applications/timeline').then((r) => r.data.data),
  });

  const { data: matchedJobs } = useQuery({
    queryKey: ['matched-jobs'],
    queryFn: () => api.get('/jobs/matched?limit=5').then((r) => r.data.data),
  });

  const { data: automationLogs } = useQuery({
    queryKey: ['automation-recent'],
    queryFn: () => api.get('/automation/logs?limit=3').then((r) => r.data.data),
  });

  const statCards = [
    {
      icon: Briefcase, label: 'Total Applications', value: stats?.total || 0,
      color: 'text-brand-600', bg: 'from-brand-500/10 to-brand-600/5',
      border: 'border-brand-100 dark:border-brand-900/50',
      trend: stats?.total > 0 ? '+12%' : null,
    },
    {
      icon: CheckCircle2, label: 'Interviews', value: stats?.interviews || 0,
      color: 'text-purple-600', bg: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-100 dark:border-purple-900/50',
      trend: stats?.interviews > 0 ? '+8%' : null,
    },
    {
      icon: TrendingUp, label: 'Response Rate', value: `${stats?.responseRate || 0}%`,
      color: 'text-green-600', bg: 'from-green-500/10 to-green-600/5',
      border: 'border-green-100 dark:border-green-900/50',
      trend: null,
    },
    {
      icon: Target, label: 'Offers Received', value: stats?.offers || 0,
      color: 'text-orange-600', bg: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-100 dark:border-orange-900/50',
      trend: null,
    },
  ];

  const pieData = stats ? [
    { name: 'Applied', value: stats.applied || 0, color: STATUS_COLORS.APPLIED },
    { name: 'Interviews', value: stats.interviews || 0, color: STATUS_COLORS.INTERVIEW_SCHEDULED },
    { name: 'Offers', value: stats.offers || 0, color: STATUS_COLORS.OFFER_RECEIVED },
    { name: 'Rejected', value: stats.rejected || 0, color: STATUS_COLORS.REJECTED },
    { name: 'Pending', value: stats.pending || 0, color: STATUS_COLORS.PENDING },
  ].filter((d) => d.value > 0) : [];

  const recentLogs = Array.isArray(automationLogs) ? automationLogs : automationLogs?.logs || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your AI-powered job search command center</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={`relative p-6 rounded-2xl border bg-gradient-to-br ${card.bg} ${card.border} card-hover overflow-hidden`}
          >
            <div className="orb orb-brand w-20 h-20 -right-4 -top-4 opacity-10" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={`text-3xl font-bold mt-2 ${card.color}`}>
                  {statsLoading ? <Skeleton className="h-8 w-16 inline-block" /> : (
                    <AnimatedNumber value={card.value} />
                  )}
                </p>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">{card.trend} this week</span>
                  </div>
                )}
              </div>
              <div className={`w-10 h-10 bg-gradient-to-br ${card.bg} rounded-xl flex items-center justify-center border ${card.border}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 p-6 rounded-2xl border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Application Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            {stats?.total > 0 && (
              <span className="text-xs bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short' })} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, 'Applications']}
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorCount)" dot={{ fill: 'hsl(var(--primary))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto bg-muted/50 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Start applying to see your activity chart</p>
                </div>
                <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline font-medium">
                  Browse jobs <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl border bg-card"
        >
          <h2 className="font-semibold mb-1">Status Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-4">All time</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3} strokeWidth={2} stroke="hsl(var(--card))">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-center">
              <div className="text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Apply to jobs to see status breakdown</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom row: Matched jobs + Recent automation */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top Matched Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-3"
        >
          {matchedJobs && matchedJobs.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Top Matched Jobs
                </h2>
                <Link href="/jobs" className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-medium">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid gap-3">
                {matchedJobs.slice(0, 3).map((job: any) => <JobCard key={job.id} job={job} />)}
              </div>
            </>
          ) : (
            <div className="h-full rounded-2xl border bg-card p-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/50 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold">No matched jobs yet</p>
                <p className="text-sm text-muted-foreground mt-1">Connect a platform to start finding your perfect roles.</p>
              </div>
              <Link href="/integrations" className="btn-brand text-sm">
                Connect a Platform
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent Automation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 p-6 rounded-2xl border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand-600" />
              Recent Automation
            </h2>
            <Link href="/automation" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log: any) => {
                const isRunning = log.status === 'RUNNING';
                const isComplete = log.status === 'COMPLETED';
                const isFailed = log.status === 'FAILED';
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRunning ? 'bg-brand-100 dark:bg-brand-950' : isComplete ? 'bg-green-100 dark:bg-green-950' : isFailed ? 'bg-red-100 dark:bg-red-950' : 'bg-muted'}`}>
                      <Bot className={`w-4 h-4 ${isRunning ? 'text-brand-600 animate-pulse' : isComplete ? 'text-green-600' : isFailed ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-1">{log.applications?.[0]?.job?.platform?.displayName || log.applications?.[0]?.job?.title || 'Auto Apply'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-medium ${isRunning ? 'text-brand-600' : isComplete ? 'text-green-600' : isFailed ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {log.status}
                        </span>
                        {log.completedAt && (
                          <span className="text-xs text-muted-foreground/60">
                            · {new Date(log.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              <Clock className="w-10 h-10 text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No automation runs yet.</p>
              <Link href="/jobs" className="text-xs text-brand-600 hover:underline mt-1 font-medium">Start applying</Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
