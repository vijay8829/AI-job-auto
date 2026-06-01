'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, RefreshCw, Zap, Plug, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { JobCard } from '@/components/jobs/job-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'];
const EXP_LEVELS = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'];
const WORK_MODE_COLORS: Record<string, string> = {
  REMOTE: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50',
  HYBRID: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  ONSITE: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
};

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150',
        active
          ? color || 'bg-brand-600 text-white border-brand-600 shadow-sm'
          : 'bg-muted/40 text-muted-foreground border-transparent hover:border-border hover:bg-muted',
      )}
    >
      {label}
      {active && <X className="inline w-3 h-3 ml-1.5 -mr-0.5" />}
    </motion.button>
  );
}

export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { query, workMode, experienceLevel, page }],
    queryFn: () => api.get('/jobs', { params: { query: query || undefined, workMode: workMode || undefined, experienceLevel: experienceLevel || undefined, page, limit: 20 } }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['platform-accounts'],
    queryFn: () => api.get('/platforms/accounts').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const hasConnectedPlatforms = (accounts as any[]).some((a: any) => a.isActive);
  const [triggering, setTriggering] = useState(false);

  const triggerSearch = async () => {
    setTriggering(true);
    try {
      await api.post('/jobs/search/trigger');
      setTimeout(() => { refetch(); setTriggering(false); }, 5000);
    } catch { setTriggering(false); }
  };

  const hasFilters = !!(workMode || experienceLevel || query);
  const clearFilters = () => { setQuery(''); setWorkMode(''); setExperienceLevel(''); setPage(1); };
  const jobs = data?.jobs || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Job Feed</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pagination ? `${pagination.total.toLocaleString()} jobs matched to your profile` : 'AI-matched jobs across all platforms'}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={triggerSearch}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 hover:shadow-glow-sm transition-all disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', triggering && 'animate-spin')} />
          {triggering ? 'Searching...' : 'Refresh'}
        </motion.button>
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search jobs, companies, skills..."
            className="w-full pl-11 pr-4 py-3 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all hover:border-brand-200 dark:hover:border-brand-800/50"
          />
          {query && (
            <button onClick={() => { setQuery(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all',
            showFilters || hasFilters
              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/50 shadow-sm'
              : 'hover:bg-muted border-border',
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 ml-0.5" />}
        </motion.button>
      </motion.div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Mode</p>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((m) => (
                    <FilterChip
                      key={m}
                      label={m.charAt(0) + m.slice(1).toLowerCase()}
                      active={workMode === m}
                      onClick={() => { setWorkMode(workMode === m ? '' : m); setPage(1); }}
                      color={workMode === m ? WORK_MODE_COLORS[m] : undefined}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Experience Level</p>
                <div className="flex flex-wrap gap-2">
                  {EXP_LEVELS.map((l) => (
                    <FilterChip
                      key={l}
                      label={l.charAt(0) + l.slice(1).toLowerCase()}
                      active={experienceLevel === l}
                      onClick={() => { setExperienceLevel(experienceLevel === l ? '' : l); setPage(1); }}
                    />
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : jobs.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {jobs.length} of {pagination?.total || jobs.length} jobs</span>
            {hasFilters && (
              <button onClick={clearFilters} className="text-brand-600 hover:underline font-medium">Clear filters</button>
            )}
          </div>

          <motion.div layout className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {jobs.map((job: any, i: number) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <JobCard job={job} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </motion.button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page <span className="font-semibold text-foreground">{page}</span> of {pagination.totalPages}
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages}
                className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </>
      ) : !hasConnectedPlatforms ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 rounded-2xl border bg-card/50">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/50 dark:to-purple-950/50 rounded-3xl flex items-center justify-center mb-5">
            <Plug className="w-10 h-10 text-brand-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">No platforms connected</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Connect LinkedIn, Indeed, or other job platforms to start finding and applying to jobs automatically.
          </p>
          <Link href="/integrations" className="btn-brand-lg inline-flex items-center gap-2">
            <Plug className="w-4 h-4" /> Connect a Platform
          </Link>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 rounded-2xl border bg-card/50">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/50 dark:to-purple-950/50 rounded-3xl flex items-center justify-center mb-5">
            <Zap className="w-10 h-10 text-brand-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">{hasFilters ? 'No jobs match your filters' : 'No jobs yet'}</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {hasFilters ? 'Try adjusting or clearing your filters.' : 'Click "Refresh" to trigger an AI job search across your connected platforms.'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="btn-brand-lg inline-flex items-center gap-2">
              <X className="w-4 h-4" /> Clear Filters
            </button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={triggerSearch} disabled={triggering} className="btn-brand-lg inline-flex items-center gap-2 disabled:opacity-60">
              <RefreshCw className={cn('w-4 h-4', triggering && 'animate-spin')} />
              {triggering ? 'Searching...' : 'Trigger Job Search'}
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
