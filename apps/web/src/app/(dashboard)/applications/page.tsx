'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, ExternalLink, Bot, ChevronDown, CheckCircle, Clock, XCircle, Star, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STATUSES = [
  { value: '', label: 'All', color: 'bg-muted text-muted-foreground', dot: '#94a3b8' },
  { value: 'PENDING', label: 'Pending', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', dot: '#94a3b8' },
  { value: 'APPLIED', label: 'Applied', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300', dot: '#3b82f6' },
  { value: 'UNDER_REVIEW', label: 'Reviewing', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300', dot: '#f59e0b' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300', dot: '#8b5cf6' },
  { value: 'OFFER_RECEIVED', label: 'Offer', color: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300', dot: '#10b981' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300', dot: '#ef4444' },
];

const STATUS_ICON: Record<string, React.ElementType> = {
  APPLIED: CheckCircle,
  UNDER_REVIEW: Clock,
  INTERVIEW_SCHEDULED: Calendar,
  OFFER_RECEIVED: Star,
  REJECTED: XCircle,
  PENDING: Clock,
};

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', statusFilter],
    queryFn: () => api.get('/applications', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/applications/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const appList = Array.isArray(applications) ? applications : (applications as any)?.applications || [];

  const counts: Record<string, number> = {};
  appList.forEach((app: any) => { counts[app.status] = (counts[app.status] || 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Applications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {appList.length > 0 ? `${appList.length} application${appList.length !== 1 ? 's' : ''} tracked` : 'Track all your job applications in one place'}
        </p>
      </motion.div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const count = s.value ? (counts[s.value] || 0) : appList.length;
          const active = statusFilter === s.value;
          return (
            <motion.button
              key={s.value}
              whileTap={{ scale: 0.96 }}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 border',
                active
                  ? s.color + ' border-current/30 shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted border-transparent hover:border-border',
              )}
            >
              {s.value && <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />}
              {s.label}
              {count > 0 && (
                <span className={cn('ml-0.5 text-xs tabular-nums px-1.5 py-0.5 rounded-full', active ? 'bg-white/30' : 'bg-muted')}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : appList.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24 rounded-2xl border bg-card/50">
          <div className="w-16 h-16 mx-auto bg-muted/60 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {statusFilter ? `No ${STATUSES.find(s => s.value === statusFilter)?.label} applications` : 'No applications yet'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {statusFilter ? 'Try a different status filter.' : 'Head to the Job Feed to start applying!'}
          </p>
          {!statusFilter && (
            <Link href="/jobs" className="btn-brand text-sm inline-flex items-center gap-2">
              Browse Jobs <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {appList.map((app: any, i: number) => {
              const status = STATUSES.find((s) => s.value === app.status);
              const StatusIcon = STATUS_ICON[app.status] || Clock;
              const isExpanded = expandedId === app.id;

              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="rounded-2xl border bg-card hover:border-brand-100 dark:hover:border-brand-900/50 hover:shadow-sm transition-all duration-150 overflow-hidden"
                >
                  <div
                    className="flex items-start gap-4 p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    {/* Company avatar */}
                    <div className="w-11 h-11 rounded-xl border bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 text-sm font-bold overflow-hidden">
                      {app.job?.companyLogoUrl ? (
                        <img src={app.job.companyLogoUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="gradient-text">{app.job?.company?.[0]?.toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-1">{app.job?.title}</h3>
                          <p className="text-sm text-muted-foreground">{app.job?.company}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status badge */}
                          {status && (
                            <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-current/20', status.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          )}

                          {/* Status update */}
                          <div className="relative group/dropdown">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border bg-card shadow-xl z-20 p-1 hidden group-focus-within/dropdown:block">
                              {STATUSES.filter((s) => s.value && s.value !== app.status).map((s) => (
                                <button
                                  key={s.value}
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: app.id, status: s.value }); }}
                                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <a
                            href={app.job?.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {app.appliedAt
                            ? `Applied ${formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}`
                            : `Added ${formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}`}
                        </span>
                        {app.isAutoApplied && (
                          <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">
                            <Bot className="w-3 h-3" /> AI Applied
                          </span>
                        )}
                        {app.job?.platform?.displayName && (
                          <span className="px-1.5 py-0.5 bg-muted rounded-md">{app.job.platform.displayName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable automation detail */}
                  <AnimatePresence>
                    {isExpanded && app.automationLog && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t"
                      >
                        <div className="px-5 py-4 bg-muted/20">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Bot className="w-3.5 h-3.5" />
                            <span className="font-medium">Automation Log</span>
                            <span className={cn('font-semibold ml-1',
                              app.automationLog.status === 'COMPLETED' ? 'text-green-600' :
                              app.automationLog.status === 'FAILED' ? 'text-red-500' :
                              app.automationLog.status === 'RUNNING' ? 'text-brand-600' :
                              'text-amber-600'
                            )}>
                              {app.automationLog.status}
                            </span>
                          </div>
                          {app.automationLog.currentStep && (
                            <p className="text-xs text-muted-foreground">{app.automationLog.currentStep}</p>
                          )}
                          {app.automationLog.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{app.automationLog.errorMessage}</p>
                          )}
                          {app.automationLog.status === 'NEEDS_REVIEW' && (
                            <Link href="/automation" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-lg hover:opacity-80 transition-opacity">
                              Review & Submit <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
