'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, CheckCheck, Zap, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications-panel'],
    queryFn: () => api.get('/notifications?limit=8').then((r) => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-panel'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const typeIcon: Record<string, string> = {
    APPLICATION_SUBMITTED: '✅',
    APPLICATION_VIEWED: '👁',
    INTERVIEW_SCHEDULED: '📅',
    JOB_MATCH: '🎯',
    SYSTEM_ALERT: '⚠️',
    SESSION_EXPIRED: '🔐',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-2 w-96 rounded-2xl z-50 overflow-hidden border border-white/[0.08]"
      style={{ background: 'rgba(12,10,24,0.97)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1)' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-white/90">Notifications</h3>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}
            >
              {unreadCount}
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              className="text-xs text-neon-purple hover:text-neon-cyan flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neon-purple/10 transition-all"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/40">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n: any, i: number) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex gap-3 p-4 hover:bg-white/[0.03] transition-colors cursor-pointer',
                !n.isRead && 'bg-neon-purple/[0.04]',
              )}
            >
              <span className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 line-clamp-1">{n.title}</p>
                <p className="text-xs text-white/40 line-clamp-2 mt-0.5">{n.body}</p>
                <p className="text-xs text-white/25 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-1.5 h-1.5 rounded-full bg-neon-purple mt-2 shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function Header() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications?limit=1').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  return (
    <header
      className="h-16 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 border-b border-white/[0.06]"
      style={{ background: 'rgba(10,9,20,0.92)', backdropFilter: 'blur(20px)' }}
    >
      {/* Search */}
      <motion.button
        animate={searchFocused ? { scale: 1 } : { scale: 1 }}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 border',
          searchFocused
            ? 'bg-neon-purple/10 border-neon-purple/40 text-white/80 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
            : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06] hover:border-white/[0.1]',
        )}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      >
        <Search className={cn('w-4 h-4 transition-colors', searchFocused ? 'text-neon-purple' : 'text-white/30')} />
        <span>Search jobs, companies...</span>
        <kbd className="ml-3 text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.08] text-white/20 bg-white/[0.03]">⌘K</kbd>
      </motion.button>

      <div className="flex items-center gap-2">
        {/* AI Status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neon-green/20 bg-neon-green/5">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-neon-green"
          />
          <Activity className="w-3 h-3 text-neon-green/60" />
          <span className="text-[10px] font-bold text-neon-green uppercase tracking-wider">AI Active</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotifs((v) => !v)}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative border',
              showNotifs
                ? 'bg-neon-purple/15 border-neon-purple/30 text-neon-purple shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                : 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/[0.1]',
            )}
          >
            <Bell className="w-4 h-4" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <AnimatePresence>
            {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
          </AnimatePresence>
        </div>

        {/* Upgrade CTA */}
        <motion.a
          href="/pricing"
          whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
          whileTap={{ scale: 0.97 }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        >
          <Zap className="w-3 h-3" />
          Upgrade
        </motion.a>
      </div>
    </header>
  );
}
