'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

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
type ProfileFormWithEmail = ProfileForm & { email?: string };
type PasswordForm = z.infer<typeof passwordSchema>;

type Tab = 'profile' | 'security' | 'notifications' | 'billing';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user, setUser, logout } = useAuthStore();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences
      </p>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0">
          <div className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-w-0"
        >
          {tab === 'profile' && <ProfileTab user={user} setUser={setUser} />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'billing' && <BillingTab logout={logout} />}
        </motion.div>
      </div>
    </div>
  );
}

function ProfileTab({
  user,
  setUser,
}: {
  user: any;
  setUser: (u: any) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
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
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Personal information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Full name
            </label>
            <input
              {...register('name')}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email <span className="text-muted-foreground text-xs">(read-only)</span>
            </label>
            <input
              type="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Job title
          </label>
          <input
            {...register('title')}
            placeholder="e.g. Senior Software Engineer"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Location
          </label>
          <input
            {...register('location')}
            placeholder="e.g. San Francisco, CA"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Bio
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            placeholder="Tell employers a bit about yourself..."
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          {errors.bio && (
            <p className="text-destructive text-xs mt-1">
              {errors.bio.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Save changes
        </button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password updated');
      reset();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Failed to update password'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Change password
        </h2>

        {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-foreground mb-1.5 capitalize">
              {field === 'currentPassword'
                ? 'Current password'
                : field === 'newPassword'
                  ? 'New password'
                  : 'Confirm new password'}
            </label>
            <input
              {...register(field as keyof PasswordForm)}
              type="password"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors[field as keyof PasswordForm] && (
              <p className="text-destructive text-xs mt-1">
                {errors[field as keyof PasswordForm]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Update password
        </button>
      </div>
    </form>
  );
}

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

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    {
      key: 'applicationSubmitted',
      label: 'Application submitted',
      desc: 'When an application is successfully sent',
    },
    {
      key: 'applicationViewed',
      label: 'Application viewed',
      desc: 'When a recruiter views your application',
    },
    {
      key: 'interviewInvite',
      label: 'Interview invites',
      desc: 'When you receive an interview request',
    },
    {
      key: 'jobMatches',
      label: 'New job matches',
      desc: 'Daily digest of high-scoring new jobs',
    },
    {
      key: 'weeklyDigest',
      label: 'Weekly digest',
      desc: 'Summary of your application activity',
    },
    {
      key: 'productUpdates',
      label: 'Product updates',
      desc: 'New features and platform improvements',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Email notifications
        </h2>

        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs[key] ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  prefs[key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Save preferences
        </button>
      </div>
    </div>
  );
}

function BillingTab({ logout }: { logout: () => void }) {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/subscriptions').then((r) => r.data.data),
  });

  const { mutate: openPortal, isPending: portalLoading } = useMutation({
    mutationFn: () =>
      api.post('/subscriptions/portal').then((r) => r.data.data),
    onSuccess: ({ url }) => window.open(url, '_blank'),
    onError: () => toast.error('Failed to open billing portal'),
  });

  const { mutate: deleteAccount, isPending: deleteLoading } = useMutation({
    mutationFn: () => api.delete('/users/me'),
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
    },
    onError: () => toast.error('Failed to delete account'),
  });

  const planBadge: Record<string, string> = {
    FREE: 'bg-muted text-muted-foreground',
    PRO: 'bg-blue-500/10 text-blue-600',
    ENTERPRISE: 'bg-purple-500/10 text-purple-600',
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Current plan
        </h2>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-accent/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                  planBadge[subscription?.plan ?? 'FREE']
                }`}
              >
                {subscription?.plan ?? 'FREE'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {subscription?.plan === 'FREE'
                ? '3 applications/month · 1 resume'
                : subscription?.plan === 'PRO'
                  ? '50 applications/month · 5 resumes'
                  : 'Unlimited applications · Unlimited resumes'}
            </p>
          </div>
          {subscription?.plan !== 'FREE' && (
            <button
              onClick={() => openPortal()}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              Manage billing
            </button>
          )}
        </div>

        {subscription?.plan === 'FREE' && (
          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-1">
              Upgrade to Pro
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Get 50 applications/month, priority matching, and full automation.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View plans
            </a>
          </div>
        )}
      </div>

      <div className="card p-6 border-destructive/30">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot
          be undone.
        </p>
        <button
          onClick={() => {
            if (
              window.confirm(
                'Are you sure you want to delete your account? This action cannot be undone.',
              )
            ) {
              deleteAccount();
            }
          }}
          disabled={deleteLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          {deleteLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete account
        </button>
      </div>
    </div>
  );
}
