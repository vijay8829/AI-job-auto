'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Moon, Sun, Search, X, CheckCheck, ExternalLink, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
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
      className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-semibold">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={() => markAllMutation.mutate()} className="text-xs text-brand-600 hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n: any, i: number) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                !n.isRead && 'bg-brand-50/50 dark:bg-brand-950/20',
              )}
            >
              <span className="text-lg shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-brand-600 mt-1.5 shrink-0" />}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const [showNotifs, setShowNotifs] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications?limit=1').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  return (
    <header className="h-16 border-b px-6 flex items-center justify-between bg-card/95 backdrop-blur-sm shrink-0 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-muted/70 hover:bg-muted rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all duration-150 border border-transparent hover:border-border">
          <Search className="w-4 h-4" />
          <span>Search jobs, companies...</span>
          <kbd className="ml-3 text-xs bg-background border px-1.5 py-0.5 rounded-md opacity-60">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-150"
        >
          <AnimatePresence mode="wait">
            {theme === 'dark' ? (
              <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Sun className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Moon className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowNotifs((v) => !v)}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative',
              showNotifs ? 'bg-brand-50 dark:bg-brand-950 text-brand-600' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
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
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-brand-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 shadow-sm"
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

        {/* Pro badge for free users */}
        <motion.a
          href="/pricing"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-brand text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <Zap className="w-3 h-3" />
          Upgrade
        </motion.a>
      </div>
    </header>
  );
}
