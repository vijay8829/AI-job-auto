'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, BarChart2,
  Zap, Timer, TrendingUp, Shield, ExternalLink, RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  QUEUED:       { label: 'Queued',      icon: Clock,         color: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-800' },
  RUNNING:      { label: 'Running',     icon: RefreshCw,     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900' },
  COMPLETED:    { label: 'Completed',   icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900' },
  FAILED:       { label: 'Failed',      icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900' },
  NEEDS_REVIEW: { label: 'Needs Review',icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900' },
  CANCELLED:    { label: 'Cancelled',   icon: XCircle,       color: 'text-muted-foreground', bg: 'bg-muted' },
};

function QueueStatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="p-4 rounded-2xl border bg-card flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function LogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.QUEUED;
  const Icon = cfg.icon;

  const cancelMutation = useMutation({
    mutationFn: () => api.delete(`/automation/logs/${log.id}/cancel`),
    onSuccess: () => { toast.success('Automation cancelled'); queryClient.invalidateQueries({ queryKey: ['automation-logs'] }); },
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/automation/logs/${log.id}/submit`),
    onSuccess: () => { toast.success('Submitted for final review'); queryClient.invalidateQueries({ queryKey: ['automation-logs'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  const retryMutation = useMutation({
    mutationFn: () => api.post('/automation/start', { jobId: log.applications?.[0]?.jobId, mode: 'SEMI_AUTO' }),
    onSuccess: () => { toast.success('Automation restarted'); queryClient.invalidateQueries({ queryKey: ['automation-logs'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Retry failed'),
  });

  const job = log.applications?.[0]?.job;
  const isCaptchaError = /captcha/i.test(log.errorMessage || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card overflow-hidden"
    >
      <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
          <Icon className={cn('w-4.5 h-4.5', cfg.color, log.status === 'RUNNING' && 'animate-spin')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm truncate">{job?.title || 'Application'}</p>
                {job?.externalUrl && (
                  <a href={job.externalUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-brand-600 transition-colors shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{job?.company || '—'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', cfg.bg, cfg.color)}>{cfg.label}</span>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
            {log.durationMs && <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{Math.round(log.durationMs / 1000)}s</span>}
            {log.currentStep && <span className="text-brand-600 font-medium">{log.currentStep}</span>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t space-y-3">
              {/* Error / CAPTCHA notice */}
              {log.errorMessage && (
                isCaptchaError ? (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-semibold">CAPTCHA blocked this application</p>
                      <p className="text-xs mt-0.5 opacity-80">
                        Open the job link, complete the CAPTCHA manually, then click Retry below.
                      </p>
                      {job?.externalUrl && (
                        <a href={job.externalUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs text-amber-700 underline hover:no-underline">
                          <ExternalLink className="w-3 h-3" /> Open job listing
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-xl p-3">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Automation failed</p>
                      <p className="text-xs mt-0.5 opacity-80">{log.errorMessage}</p>
                    </div>
                  </div>
                )
              )}

              {/* Steps timeline */}
              {Array.isArray(log.steps) && log.steps.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps</p>
                  {log.steps.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {step.status === 'completed'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        : step.status === 'failed'
                        ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        : <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <span className={step.status === 'failed' ? 'text-red-600' : 'text-foreground'}>{step.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {log.totalSteps > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{log.completedSteps}/{log.totalSteps} steps</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-brand rounded-full transition-all"
                      style={{ width: `${(log.completedSteps / log.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {log.status === 'NEEDS_REVIEW' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); submitMutation.mutate(); }}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
                  </button>
                )}
                {log.status === 'FAILED' && log.applications?.[0]?.jobId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); retryMutation.mutate(); }}
                    disabled={retryMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {retryMutation.isPending ? 'Retrying…' : 'Retry'}
                  </button>
                )}
                {(log.status === 'QUEUED' || log.status === 'RUNNING') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(); }}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-60 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AutomationPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => api.get('/automation/queue/stats').then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['automation-analytics'],
    queryFn: () => api.get('/automation/analytics').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['automation-logs', statusFilter],
    queryFn: () => api.get('/automation/logs', { params: { limit: 30 } }).then((r) => r.data.data),
    refetchInterval: 8000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['automation-logs'] }),
      queryClient.refetchQueries({ queryKey: ['queue-stats'] }),
      queryClient.refetchQueries({ queryKey: ['automation-analytics'] }),
    ]);
    setIsRefreshing(false);
  };

  const logs: any[] = (logsData?.logs || []).filter((l: any) => !statusFilter || l.status === statusFilter);

  const statuses = ['', 'RUNNING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED', 'QUEUED'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-brand-600" /> Automation
          </h1>
          <p className="text-muted-foreground mt-1">Monitor your automated applications in real time</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm hover:bg-muted transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Live queue stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <QueueStatCard label="Queued"    value={queueStats?.waiting   ?? 0} icon={Clock}       color="bg-gray-100 dark:bg-gray-800 text-gray-600" />
        <QueueStatCard label="Running"   value={queueStats?.active    ?? 0} icon={RefreshCw}   color="bg-blue-100 dark:bg-blue-900 text-blue-600" />
        <QueueStatCard label="Completed" value={queueStats?.completed ?? 0} icon={CheckCircle2} color="bg-green-100 dark:bg-green-900 text-green-600" />
        <QueueStatCard label="Failed"    value={queueStats?.failed    ?? 0} icon={XCircle}     color="bg-red-100 dark:bg-red-900 text-red-600" />
        {analytics && (
          <QueueStatCard label="Success Rate" value={analytics.successRate ?? 0} icon={TrendingUp} color="bg-brand-50 dark:bg-brand-950 text-brand-600" />
        )}
      </div>

      {/* Analytics summary */}
      {analytics && analytics.total > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Failure Breakdown</span>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.failureReasons).map(([key, val]: [string, any]) => (
                val > 0 && (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium tabular-nums">{val}</span>
                  </div>
                )
              ))}
              {Object.values(analytics.failureReasons).every((v: any) => v === 0) && (
                <p className="text-sm text-muted-foreground">No failures recorded</p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Performance</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total runs</span><span className="font-medium">{analytics.total}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg duration</span><span className="font-medium">{analytics.avgDurationSec}s</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Success rate</span><span className={cn('font-bold', analytics.successRate >= 70 ? 'text-green-600' : analytics.successRate >= 40 ? 'text-amber-600' : 'text-red-600')}>{analytics.successRate}%</span></div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">By Platform</span>
            </div>
            <div className="space-y-2 text-sm">
              {Object.entries(analytics.byPlatform || {}).map(([name, stats]: [string, any]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-muted-foreground capitalize">{name}</span>
                  <span className="font-medium tabular-nums text-green-600">{stats.completed}/{stats.total}</span>
                </div>
              ))}
              {Object.keys(analytics.byPlatform || {}).length === 0 && (
                <p className="text-muted-foreground">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const cfg = s ? STATUS_CONFIG[s] : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {cfg ? cfg.label : 'All'}
            </button>
          );
        })}
      </div>

      {/* Run history */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto">
          <div className="w-20 h-20 gradient-brand rounded-3xl flex items-center justify-center mx-auto mb-6 opacity-80">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No automation runs yet</h3>
          <p className="text-muted-foreground mb-6">Browse the job feed and click <strong>Auto Apply</strong> on any job to start the AI automation engine.</p>
          <a href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
            <Zap className="w-4 h-4" />
            Browse Jobs &amp; Auto Apply
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => <LogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}
