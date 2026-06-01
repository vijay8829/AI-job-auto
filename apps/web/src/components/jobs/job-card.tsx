'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, DollarSign, Zap, ExternalLink, Bookmark, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    companyLogoUrl?: string;
    location?: string;
    workMode?: string;
    employmentType?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    postedAt?: string;
    externalUrl?: string;
    skills: string[];
    platform: { name: string; displayName: string; logoUrl?: string };
    aiScores?: Array<{ overallScore: number; matchedSkills: string[]; missingSkills: string[] }>;
  };
  onApply?: (jobId: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const isHigh = score >= 75;
  const isMid = score >= 50;
  return (
    <div className={cn(
      'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border',
      isHigh ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 shadow-glow-green/20' :
      isMid ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' :
      'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50',
    )}>
      {isHigh && <Sparkles className="w-3 h-3" />}
      {score}% match
    </div>
  );
}

export function JobCard({ job, onApply }: JobCardProps) {
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const queryClient = useQueryClient();
  const aiScore = job.aiScores?.[0];

  const applyMutation = useMutation({
    mutationFn: (jobId: string) => api.post('/automation/start', { jobId, mode: 'SEMI_AUTO' }),
    onSuccess: () => {
      toast.success('Automation started! Check the Automation tab for live status.', { duration: 4000, icon: '🤖' });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
      setApplied(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to start application'),
  });

  const saveMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/save`),
    onSuccess: () => setSaved(true),
    onError: () => setSaved((v) => !v),
  });

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null;
    const currency = job.salaryCurrency || 'USD';
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : n.toString();
    if (job.salaryMin && job.salaryMax) return `${currency} ${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
    if (job.salaryMin) return `${currency} ${fmt(job.salaryMin)}+`;
    return null;
  };

  const workModeColor: Record<string, string> = {
    REMOTE: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400',
    HYBRID: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
    ONSITE: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="p-5 rounded-2xl border bg-card hover:border-brand-200 dark:hover:border-brand-800/50 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
    >
      {/* Gradient accent top border */}
      {aiScore && aiScore.overallScore >= 75 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-brand rounded-t-2xl opacity-60" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Company Logo */}
          <div className="w-11 h-11 rounded-xl border bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground overflow-hidden">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-contain" />
            ) : (
              <span className="gradient-text">{job.company[0]?.toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{job.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {job.workMode && (
                <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium', workModeColor[job.workMode] || 'bg-muted text-muted-foreground')}>
                  {job.workMode.charAt(0) + job.workMode.slice(1).toLowerCase()}
                </span>
              )}
              {job.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{job.location}
                </span>
              )}
              {formatSalary() && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />{formatSalary()}
                </span>
              )}
              {job.postedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {aiScore && <ScoreBadge score={aiScore.overallScore} />}
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{job.platform.displayName}</span>
        </div>
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.skills.slice(0, 7).map((skill) => {
            const isMatched = aiScore?.matchedSkills?.some((s) => s.toLowerCase() === skill.toLowerCase());
            return (
              <span key={skill} className={cn(
                'text-xs px-2 py-0.5 rounded-md font-medium transition-colors',
                isMatched
                  ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                  : 'bg-muted text-muted-foreground',
              )}>
                {skill}
              </span>
            );
          })}
          {job.skills.length > 7 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">+{job.skills.length - 7}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
        <AnimatePresence mode="wait">
          {applied ? (
            <motion.div
              key="applied"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 text-xs font-semibold rounded-xl border border-green-200 dark:border-green-800/50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Automation Running
            </motion.div>
          ) : (
            <motion.button
              key="apply"
              whileTap={{ scale: 0.97 }}
              onClick={() => applyMutation.mutate(job.id)}
              disabled={applyMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2 gradient-brand text-white text-xs font-semibold rounded-xl hover:opacity-90 hover:shadow-glow-sm transition-all disabled:opacity-60"
            >
              {applyMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Starting...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" />Auto Apply</>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => window.open(job.externalUrl || '', '_blank')}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="View original posting"
        >
          <ExternalLink className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setSaved((v) => !v); if (!saved) saveMutation.mutate(job.id); }}
          className={cn('p-2 rounded-xl transition-all', saved ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/50' : 'hover:bg-muted text-muted-foreground hover:text-brand-600')}
          title={saved ? 'Saved' : 'Save job'}
        >
          <Bookmark className={cn('w-4 h-4 transition-all', saved && 'fill-current')} />
        </motion.button>
      </div>
    </motion.div>
  );
}
