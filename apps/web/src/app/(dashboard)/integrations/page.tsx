'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, Link2, AlertTriangle, Shield, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PLATFORM_META: Record<string, { icon: string; color: string; bg: string; border: string; desc: string }> = {
  linkedin:   { icon: '💼', color: 'text-blue-700',   bg: 'from-blue-500/10 to-blue-600/5',   border: 'border-blue-100 dark:border-blue-900/40',   desc: 'World\'s largest professional network' },
  indeed:     { icon: '🔍', color: 'text-indigo-700', bg: 'from-indigo-500/10 to-indigo-600/5', border: 'border-indigo-100 dark:border-indigo-900/40', desc: 'Millions of jobs, one easy search' },
  naukri:     { icon: '🇮🇳', color: 'text-orange-700', bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-100 dark:border-orange-900/40', desc: 'India\'s #1 job portal' },
  glassdoor:  { icon: '🚪', color: 'text-green-700',  bg: 'from-green-500/10 to-green-600/5',  border: 'border-green-100 dark:border-green-900/40',  desc: 'Jobs + company reviews & salaries' },
  wellfound:  { icon: '🚀', color: 'text-purple-700', bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-100 dark:border-purple-900/40', desc: 'Startup jobs & equity offers' },
  greenhouse: { icon: '🌱', color: 'text-emerald-700', bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-100 dark:border-emerald-900/40', desc: 'Direct company applications' },
  lever:      { icon: '⚡', color: 'text-yellow-700', bg: 'from-yellow-500/10 to-yellow-600/5', border: 'border-yellow-100 dark:border-yellow-900/40', desc: 'Modern recruiting platform' },
};

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const queryClient = useQueryClient();

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.get('/platforms').then((r) => r.data.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['platform-accounts'],
    queryFn: () => api.get('/platforms/accounts').then((r) => r.data.data),
  });

  const connectMutation = useMutation({
    mutationFn: ({ platformId, creds }: { platformId: string; creds: any }) =>
      api.post(`/platforms/${platformId}/connect`, creds),
    onSuccess: () => {
      toast.success('Platform connected! AI will start finding jobs for you.', { icon: '🎉' });
      setConnecting(null);
      setCredentials({ username: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Connection failed. Check your credentials.'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (platformId: string) => api.delete(`/platforms/${platformId}/disconnect`),
    onSuccess: () => {
      toast.success('Platform disconnected');
      queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    },
  });

  const connectedCount = accounts.filter((a: any) => a.isActive).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Platform Integrations</h1>
            <p className="text-muted-foreground mt-1 text-sm">Connect job platforms to enable AI-powered automated job search</p>
          </div>
          {connectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/50 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {connectedCount} platform{connectedCount !== 1 ? 's' : ''} active
            </div>
          )}
        </div>
      </motion.div>

      {/* Security notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 p-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-100/60 dark:border-brand-800/30 text-sm text-brand-700 dark:text-brand-300">
        <Shield className="w-4 h-4 shrink-0" />
        <span>Your credentials are encrypted with AES-256 and never stored in plain text. We use them only to automate applications on your behalf.</span>
      </motion.div>

      {/* Platform grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(platforms as any[]).map((platform: any, i: number) => {
          const account = (accounts as any[]).find((a: any) => a.platformId === platform.id);
          const isConnected = !!account?.isActive;
          const hasError = account?.status === 'AUTH_FAILED';
          const meta = PLATFORM_META[platform.name] || { icon: '🔗', color: 'text-muted-foreground', bg: 'from-muted/10 to-muted/5', border: 'border-border', desc: '' };

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200 relative overflow-hidden',
                meta.bg, meta.border,
                isConnected && !hasError && 'shadow-sm',
              )}
            >
              {/* Connected glow accent */}
              {isConnected && !hasError && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500/60 rounded-t-2xl" />
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-black/20 border border-white/40 dark:border-white/5 flex items-center justify-center text-2xl shadow-sm">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{platform.displayName}</h3>
                    {isConnected && !hasError && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta.desc || platform.baseUrl}</p>
                </div>
              </div>

              {/* Feature tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {platform.supportsEasyApply && (
                  <span className="text-xs bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Easy Apply
                  </span>
                )}
                <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">Job Search</span>
              </div>

              {/* Auth error banner */}
              {hasError && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Session expired — re-authentication required
                </div>
              )}

              {/* Action section */}
              <AnimatePresence mode="wait">
                {isConnected && !hasError ? (
                  <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Connected{account?.username ? ` · ${account.username}` : ''}</span>
                    </div>
                    <button
                      onClick={() => disconnectMutation.mutate(platform.id)}
                      disabled={disconnectMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Disconnect"
                    >
                      {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                  </motion.div>
                ) : connecting === platform.id ? (
                  <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <input
                      value={credentials.username}
                      onChange={(e) => setCredentials(c => ({ ...c, username: e.target.value }))}
                      placeholder="Email or username"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(c => ({ ...c, password: e.target.value }))}
                      placeholder="Password"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => connectMutation.mutate({ platformId: platform.id, creds: credentials })}
                        disabled={connectMutation.isPending || !credentials.username || !credentials.password}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
                      >
                        {connectMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Connecting…</> : 'Connect'}
                      </button>
                      <button onClick={() => { setConnecting(null); setCredentials({ username: '', password: '' }); }} className="px-4 py-2.5 border rounded-xl text-sm hover:bg-muted transition-colors">
                        Cancel
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      <span>Credentials are AES-256 encrypted</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="connect-btn"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setConnecting(platform.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-medium hover:bg-white/60 dark:hover:bg-black/20 hover:border-current/30 transition-all"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect Account
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {platforms.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2 opacity-30" />
          <p className="text-sm">Loading platforms...</p>
        </div>
      )}
    </div>
  );
}
