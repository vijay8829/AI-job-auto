'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Bot, Chrome, Zap, Sparkles, Check, ArrowRight, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_EMAIL = 'demo@aijobplatform.com';
const DEMO_PASSWORD = 'Demo@1234!';

const FEATURE_BULLETS = [
  { icon: '🤖', text: 'AI applies to 50+ jobs while you sleep' },
  { icon: '📊', text: 'Match scores across 7 job platforms' },
  { icon: '✉️', text: 'Get notified on interviews & offers' },
  { icon: '🔐', text: 'Anti-detection browser automation' },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const doLogin = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    setAuth(user, accessToken, refreshToken);
    router.push('/dashboard');
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await doLogin(data.email, data.password);
      toast.success('Welcome back!', { icon: '👋' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
      toast.success('Signed in as Demo User', { icon: '🎮' });
    } catch {
      try {
        await api.post('/auth/register', { email: DEMO_EMAIL, password: DEMO_PASSWORD, firstName: 'Demo', lastName: 'User' });
        await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
        toast.success('Demo account created — welcome!', { icon: '🎉' });
      } catch {
        toast.error('Demo login failed. Please try again.');
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
  const handleGoogleLogin = () => {
    if (!googleEnabled) { toast.error('Google Sign-In is not configured yet.'); return; }
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-center px-12 xl:px-16">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-brand-rich" />
        <div className="absolute inset-0 bg-black/10" />

        {/* Animated orbs */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-12 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-14"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">AI Job Platform</span>
              <p className="text-white/60 text-xs mt-0.5">Powered by GPT-4o</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              Your AI job<br />
              search is <span className="relative">
                <span className="relative z-10">working</span>
                <span className="absolute bottom-0 left-0 right-0 h-2 bg-white/20 rounded-sm -z-0" />
              </span>
            </h2>
            <p className="text-white/70 text-lg mb-10">
              Let AI handle the applications while you focus on interviews and offers.
            </p>
          </motion.div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {FEATURE_BULLETS.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3"
              >
                <span className="text-lg">{b.icon}</span>
                <span className="text-white/90 text-sm">{b.text}</span>
                <Check className="w-4 h-4 text-green-400 ml-auto" />
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {[['500+', 'Jobs matched weekly'], ['7', 'Platforms supported'], ['3x', 'Faster job search']].map(([n, l], i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{n}</div>
                <div className="text-white/60 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 gradient-brand-rich rounded-xl flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">AI Job Platform</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-7">
            No account?{' '}
            <Link href="/signup" className="text-brand-600 hover:text-brand-700 font-semibold">Sign up free →</Link>
          </p>

          {/* Demo button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 rounded-xl hover:shadow-sm transition-all mb-3 text-sm font-semibold disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            {isDemoLoading ? 'Loading demo...' : 'Try Demo — No sign-up needed'}
          </motion.button>

          {/* Google */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl transition-all mb-6 text-sm font-medium ${googleEnabled ? 'hover:bg-muted hover:border-border' : 'opacity-40 cursor-not-allowed'}`}
          >
            <Chrome className="w-5 h-5" />
            Continue with Google
            {!googleEnabled && <span className="text-xs text-muted-foreground">(not configured)</span>}
          </motion.button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Password</label>
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className="w-full pl-10 pr-12 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 gradient-brand-rich text-white font-semibold rounded-xl hover:opacity-90 hover:shadow-glow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
