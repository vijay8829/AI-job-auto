'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  User, Lock, Bell, CreditCard, Trash2, Loader2, CheckCircle,
  Palette, Sun, Moon, Monitor, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  title: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(300, 'Bio max 300 chars').optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Min 8 characters')
      .regex(/[A-Z]/, 'Need uppercase')
      .regex(/[0-9]/, 'Need number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type Tab = 'profile' | 'security' | 'notifications' | 'billing' | 'appearance';

function SettingsInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        {...props}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
          error ? 'border-destructive/60' : 'border-border',
          props.disabled && 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user, setUser, logout } = useAuthStore();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',      label: 'Profile',      icon: <User    className="w-4 h-4" /> },
    { id: 'appearance',   label: 'Appearance',   icon: <Palette className="w-4 h-4" /> },
    { id: 'security',     label: 'Security',     icon: <Lock    className="w-4 h-4" /> },
    { id: 'notifications',label: 'Notifications',icon: <Bell    className="w-4 h-4" /> },
    { id: 'billing',      label: 'Billing',      icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage your account preferences and appearance</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
        {/* Sidebar nav */}
        <nav className="sm:w-48 shrink-0">
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap border',
                  tab === t.id
                    ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
                )}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 min-w-0"
          >
            {tab === 'profile'      && <ProfileTab      user={user} setUser={setUser} />}
            {tab === 'appearance'   && <AppearanceTab />}
            {tab === 'security'     && <SecurityTab />}
            {tab === 'notifications'&& <NotificationsTab />}
            {tab === 'billing'      && <BillingTab logout={logout} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Appearance Tab ─────────────────────────────────────────────────────── */
function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      desc: 'Deep purple-black AI theme',
      preview: (
        <div className="w-full h-20 rounded-lg overflow-hidden border border-white/10" style={{ background: '#0a0914' }}>
          <div className="flex h-full">
            <div className="w-10 h-full border-r border-white/5" style={{ background: '#0e0d1c' }}>
              <div className="m-1.5 w-5 h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, #a855f7, #22d3ee)' }} />
              {[1,2,3,4].map(i => <div key={i} className="mx-1.5 my-1 h-1 rounded-full bg-white/10" />)}
            </div>
            <div className="flex-1 p-2 space-y-1.5">
              <div className="h-2 w-16 rounded-full bg-white/10" />
              <div className="grid grid-cols-2 gap-1">
                <div className="h-6 rounded-lg" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }} />
                <div className="h-6 rounded-lg" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }} />
              </div>
              <div className="h-8 rounded-lg bg-white/5" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      desc: 'Soft lavender AI theme',
      preview: (
        <div className="w-full h-20 rounded-lg overflow-hidden border border-purple-100" style={{ background: '#f8f6ff' }}>
          <div className="flex h-full">
            <div className="w-10 h-full border-r border-purple-100" style={{ background: '#f0ecff' }}>
              <div className="m-1.5 w-5 h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, #a855f7, #22d3ee)' }} />
              {[1,2,3,4].map(i => <div key={i} className="mx-1.5 my-1 h-1 rounded-full bg-purple-200/60" />)}
            </div>
            <div className="flex-1 p-2 space-y-1.5">
              <div className="h-2 w-16 rounded-full bg-purple-200/60" />
              <div className="grid grid-cols-2 gap-1">
                <div className="h-6 rounded-lg bg-white border border-purple-200" />
                <div className="h-6 rounded-lg bg-white border border-purple-200" />
              </div>
              <div className="h-8 rounded-lg bg-white border border-purple-100" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      desc: 'Follow device setting',
      preview: (
        <div className="w-full h-20 rounded-lg overflow-hidden border border-border relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full" style={{ background: '#0a0914' }}>
              <div className="p-1.5 space-y-1">
                <div className="w-full h-1 rounded-full bg-white/10" />
                <div className="w-3/4 h-1 rounded-full bg-white/5" />
                <div className="w-full h-8 rounded-lg bg-white/5 mt-1" />
              </div>
            </div>
            <div className="w-1/2 h-full" style={{ background: '#f8f6ff' }}>
              <div className="p-1.5 space-y-1">
                <div className="w-full h-1 rounded-full bg-purple-200/60" />
                <div className="w-3/4 h-1 rounded-full bg-purple-100/60" />
                <div className="w-full h-8 rounded-lg bg-white border border-purple-100 mt-1" />
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-0.5">Theme</h2>
          <p className="text-sm text-muted-foreground">Choose how AI Job Platform looks to you</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map(({ id, label, icon: Icon, desc, preview }) => {
            const active = theme === id;
            return (
              <motion.button
                key={id}
                onClick={() => setTheme(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative flex flex-col gap-3 p-4 rounded-2xl border text-left transition-all duration-200',
                  active
                    ? 'border-primary/50 bg-primary/[0.06] shadow-[0_0_20px_rgba(124,58,237,0.15)]'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="theme-active"
                    className="absolute inset-0 rounded-2xl border border-primary/40"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(34,211,238,0.03))' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {preview}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className={cn('text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            The theme is applied instantly and saved across sessions. You can also toggle it anytime from the{' '}
            <span className="text-primary font-medium">Sun/Moon button in the top navigation bar</span>.
          </p>
        </div>
      </div>

      {/* Accent preview */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-0.5">Accent colors</h2>
          <p className="text-sm text-muted-foreground">Current AI theme palette — purple primary with cyan accent</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { name: 'Purple', color: '#a855f7', label: 'Primary' },
            { name: 'Cyan',   color: '#22d3ee', label: 'Accent' },
            { name: 'Green',  color: '#34d399', label: 'Success' },
            { name: 'Pink',   color: '#f472b6', label: 'Highlight' },
          ].map(({ name, color, label }) => (
            <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30">
              <div className="w-4 h-4 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
              <div>
                <p className="text-xs font-semibold text-foreground">{name}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Profile Tab ─────────────────────────────────────────────────────────── */
function ProfileTab({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
      title: user?.profile?.headline ?? '',
      location: user?.profile?.location ?? '',
      bio: user?.profile?.summary ?? '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/users/profile', data),
    onSuccess: (res) => { setUser(res.data.data); toast.success('Profile updated'); },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Personal information</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 pb-2 border-b border-border/50">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsInput
            label="Full name"
            {...register('name')}
            placeholder="Your full name"
            error={errors.name?.message}
          />
          <SettingsInput
            label="Email (read-only)"
            type="email"
            value={user?.email ?? ''}
            readOnly
            disabled
          />
        </div>

        <SettingsInput
          label="Job title"
          {...register('title')}
          placeholder="e.g. Senior Software Engineer"
        />

        <SettingsInput
          label="Location"
          {...register('location')}
          placeholder="e.g. San Francisco, CA"
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
          <textarea
            {...register('bio')}
            rows={4}
            placeholder="Tell employers a bit about yourself..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
          />
          {errors.bio && <p className="text-destructive text-xs mt-1">{errors.bio.message}</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <motion.button
          type="submit"
          disabled={isPending}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save changes
        </motion.button>
      </div>
    </form>
  );
}

/* ── Security Tab ─────────────────────────────────────────────────────────── */
function SecurityTab() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.patch('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => { toast.success('Password updated'); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update password'),
  });

  const fields: { name: keyof PasswordForm; label: string }[] = [
    { name: 'currentPassword', label: 'Current password' },
    { name: 'newPassword',     label: 'New password' },
    { name: 'confirmPassword', label: 'Confirm new password' },
  ];

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Change password</h2>
        {fields.map(({ name, label }) => (
          <SettingsInput
            key={name}
            label={label}
            type="password"
            {...register(name)}
            error={errors[name]?.message}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <motion.button
          type="submit"
          disabled={isPending}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Update password
        </motion.button>
      </div>
    </form>
  );
}

/* ── Notifications Tab ───────────────────────────────────────────────────── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    applicationSubmitted: true,
    applicationViewed: true,
    interviewInvite: true,
    jobMatches: false,
    weeklyDigest: true,
    productUpdates: false,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch('/users/notification-preferences', prefs),
    onSuccess: () => toast.success('Notification preferences saved'),
  });

  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'applicationSubmitted', label: 'Application submitted',  desc: 'When an application is successfully sent' },
    { key: 'applicationViewed',    label: 'Application viewed',     desc: 'When a recruiter views your application' },
    { key: 'interviewInvite',      label: 'Interview invites',      desc: 'When you receive an interview request' },
    { key: 'jobMatches',           label: 'New job matches',        desc: 'Daily digest of high-scoring new jobs' },
    { key: 'weeklyDigest',         label: 'Weekly digest',          desc: 'Summary of your application activity' },
    { key: 'productUpdates',       label: 'Product updates',        desc: 'New features and platform improvements' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-1">
        <h2 className="text-lg font-semibold text-foreground mb-4">Email notifications</h2>
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0',
                prefs[key] ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                prefs[key] ? 'translate-x-5' : 'translate-x-0',
              )} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <motion.button
          onClick={() => mutate()}
          disabled={isPending}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save preferences
        </motion.button>
      </div>
    </div>
  );
}

/* ── Billing Tab ─────────────────────────────────────────────────────────── */
function BillingTab({ logout }: { logout: () => void }) {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/subscriptions').then((r) => r.data.data),
  });

  const { mutate: openPortal, isPending: portalLoading } = useMutation({
    mutationFn: () => api.post('/subscriptions/portal').then((r) => r.data.data),
    onSuccess: ({ url }) => window.open(url, '_blank'),
    onError: () => toast.error('Failed to open billing portal'),
  });

  const { mutate: deleteAccount, isPending: deleteLoading } = useMutation({
    mutationFn: () => api.delete('/users/me'),
    onSuccess: () => { toast.success('Account deleted'); logout(); },
    onError: () => toast.error('Failed to delete account'),
  });

  const plan = subscription?.plan ?? 'FREE';

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Current plan</h2>
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
          <div>
            <span className={cn(
              'text-xs font-bold px-2.5 py-0.5 rounded-full uppercase inline-block mb-1',
              plan === 'PRO' ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20' :
              plan === 'ENTERPRISE' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' :
              'bg-muted text-muted-foreground border border-border',
            )}>
              {plan}
            </span>
            <p className="text-sm text-muted-foreground">
              {plan === 'FREE' ? '3 applications/month · 1 resume' :
               plan === 'PRO'  ? '50 applications/month · 5 resumes' :
               'Unlimited applications · Unlimited resumes'}
            </p>
          </div>
          {plan !== 'FREE' && (
            <button
              onClick={() => openPortal()}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              Manage billing
            </button>
          )}
        </div>

        {plan === 'FREE' && (
          <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-sm font-semibold text-foreground mb-1">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mb-3">Get 50 applications/month, priority matching, and full automation.</p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
            >
              View plans
            </a>
          </div>
        )}
      </div>

      <div className="card p-6 border-destructive/20">
        <h2 className="text-lg font-semibold text-foreground mb-1">Danger zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Are you sure? This permanently deletes your account and all data.')) {
              deleteAccount();
            }
          }}
          disabled={deleteLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-all"
        >
          {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete account
        </button>
      </div>
    </div>
  );
}
