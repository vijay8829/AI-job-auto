'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Area, AreaChart,
  Cell,
} from 'recharts';
import { TrendingUp, Award, Target, Globe, ArrowUpRight, Zap, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const PLATFORM_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

function StatCard({ icon: Icon, label, value, color, bg, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`p-5 rounded-2xl border bg-gradient-to-br ${bg} card-hover relative overflow-hidden`}
    >
      <div className="orb orb-brand w-24 h-24 -right-6 -top-6 opacity-10" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <Icon className={`w-5 h-5 ${color}`} />
          <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1.5 font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
  });

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );

  const totalApps = data?.appStats ? Object.values(data.appStats as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0;
  const responseRate = data?.appStats
    ? Math.round(((data.appStats.INTERVIEW_SCHEDULED || 0) / Math.max(data.appStats.APPLIED || 1, 1)) * 100)
    : 0;

  const platformData = (data?.platformStats || []).map((p: any) => ({
    name: p.platform,
    applied: p.applied,
    interviews: p.interviews,
    rate: p.applied > 0 ? Math.round((p.interviews / p.applied) * 100) : 0,
  }));

  const radarData = data?.atsScores ? [
    { subject: 'Avg Match', value: data.atsScores.avg || 0, fullMark: 100 },
    { subject: 'ATS Score', value: data.atsScores.avgAts || 0, fullMark: 100 },
    { subject: 'Response %', value: responseRate, fullMark: 100 },
    { subject: 'High Matches', value: Math.min((data.atsScores.high || 0) * 10, 100), fullMark: 100 },
  ] : [];

  const statusBarData = data?.appStats ? Object.entries(data.appStats).map(([k, v]) => ({
    name: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: v as number,
  })).filter(d => d.value > 0) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Deep insights into your job search performance</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Avg AI Match Score" value={`${data?.atsScores?.avg || 0}%`} color="text-brand-600" bg="from-brand-500/10 to-brand-600/5 border-brand-100 dark:border-brand-900/50" delay={0} />
        <StatCard icon={TrendingUp} label="Response Rate" value={`${responseRate}%`} color="text-green-600" bg="from-green-500/10 to-green-600/5 border-green-100 dark:border-green-900/50" delay={0.06} />
        <StatCard icon={Award} label="High Matches (75%+)" value={data?.atsScores?.high || 0} color="text-purple-600" bg="from-purple-500/10 to-purple-600/5 border-purple-100 dark:border-purple-900/50" delay={0.12} />
        <StatCard icon={Globe} label="Active Platforms" value={data?.platformStats?.length || 0} color="text-orange-600" bg="from-orange-500/10 to-orange-600/5 border-orange-100 dark:border-orange-900/50" delay={0.18} />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">7-Day Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Daily applications submitted</p>
            </div>
            <Activity className="w-4 h-4 text-brand-600" />
          </div>
          {data?.weeklyActivity && data.weeklyActivity.some((d: any) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.weeklyActivity}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#activityGrad)" dot={{ fill: 'hsl(var(--primary))', r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No activity in the last 7 days
            </div>
          )}
        </motion.div>

        {/* Platform performance */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Platform Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Applied vs. interviews by platform</p>
            </div>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="applied" name="Applied" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {platformData.map((_: any, i: number) => <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />)}
                </Bar>
                <Bar dataKey="interviews" name="Interviews" fill="#8b5cf6" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Connect platforms and apply to see performance data
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Application status bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-3 p-6 rounded-2xl border bg-card">
          <h2 className="font-semibold mb-1">Status Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">All-time application pipeline</p>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                  {statusBarData.map((_: any, i: number) => <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No applications yet</div>
          )}
        </motion.div>

        {/* AI score radar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 p-6 rounded-2xl border bg-card">
          <h2 className="font-semibold mb-1">AI Score Profile</h2>
          <p className="text-xs text-muted-foreground mb-4">Across all scored jobs</p>
          {radarData.length > 0 && radarData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
                <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
              Score data appears after your first AI-matched job
            </div>
          )}
        </motion.div>
      </div>

      {/* Top companies */}
      {data?.topCompanies?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="p-6 rounded-2xl border bg-card">
          <h2 className="font-semibold mb-4">Most Applied Companies</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {data.topCompanies.slice(0, 8).map((co: any, i: number) => {
              const pct = Math.round((co.count / data.topCompanies[0].count) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">{co.company}</span>
                      <span className="text-xs text-muted-foreground tabular-nums ml-2">{co.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-brand"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
