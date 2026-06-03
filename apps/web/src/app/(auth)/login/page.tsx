'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Bot, Sparkles, Check, ArrowRight, Lock, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { ParticleCanvas } from '@/components/ui/particle-canvas';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_EMAIL = 'demo@aijobplatform.com';
const DEMO_PASSWORD = 'Demo@123456';

const LIVE_STATS = [
  { value: '2,847', label: 'Applications today', color: '#a855f7' },
  { value: '94%',   label: 'AI match accuracy',  color: '#22d3ee' },
  { value: '3.2×',  label: 'Faster search',      color: '#34d399' },
];

const FEATURES = [
  { icon: '🤖', text: 'AI applies to 50+ jobs while you sleep' },
  { icon: '📊', text: 'Match scores across 7 job platforms' },
  { icon: '✉️', text: 'Get notified on interviews & offers' },
  { icon: '🔐', text: 'Anti-detection browser automation' },
];

function NeonInput({ icon: Icon, error, rightSlot, ...props }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused ? 'text-neon-purple' : 'text-muted-foreground/60'}`} />
      <input
        {...props}
        onFocus={(e: any) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e: any) => { setFocused(false); props.onBlur?.(e); }}
        className={`w-full pl-10 ${rightSlot ? 'pr-12' : 'pr-4'} py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 border transition-all duration-200 outline-none bg-background/60 ${
          focused
            ? 'border-neon-purple/60 bg-primary/[0.05] shadow-[0_0_16px_rgba(168,85,247,0.1)]'
            : error
              ? 'border-destructive/50'
              : 'border-border hover:border-border/80'
        }`}
      />
      {rightSlot && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
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
      toast.error(err.response?.data?.message || 'Invalid credentials');
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
    <div className="min-h-screen flex bg-background" style={{ background: 'var(--s-auth)' }}>

      {/* ── Left panel — visual showcase (lg+) ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-center px-12 xl:px-16">
        <ParticleCanvas className="opacity-50 dark:opacity-60" />

        {/* Neural grid */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(at 30% 50%, rgba(124,58,237,0.12) 0px, transparent 60%), radial-gradient(at 80% 20%, rgba(6,182,212,0.08) 0px, transparent 50%)' }} />

        {/* Ambient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-float opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%)' }} />
        <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full blur-3xl animate-float-slow opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-border/30"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(6,182,212,0.3))', backdropFilter: 'blur(12px)' }}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #22d3ee)' }}>
                AI Job Platform
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-neon-green" />
                <p className="text-muted-foreground text-xs">Powered by GPT-4o</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-4xl xl:text-5xl font-black text-foreground mb-4 leading-tight">
              Your AI job search<br />
              is{' '}
              <span className="text-transparent bg-clip-text gradient-text-cyber">working</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Let AI handle the applications while you focus on<br />
              interviews and offers.
            </p>
          </motion.div>

          {/* Live stats */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {LIVE_STATS.map(({ value, label, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center backdrop-blur-sm"
              >
                <div className="text-2xl font-black" style={{ color }}>{value}</div>
                <div className="text-muted-foreground text-[10px] mt-0.5 leading-tight">{label}</div>
              </motion.div>
            ))}
          </div>

          {/* Feature bullets */}
          <div className="space-y-2.5">
            {FEATURES.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 border border-border/50 bg-muted/20 backdrop-blur-sm"
              >
                <span className="text-base">{b.icon}</span>
                <span className="text-foreground/80 text-sm flex-1">{b.text}</span>
                <Check className="w-4 h-4 text-neon-green shrink-0" />
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
            className="mt-8 flex items-center gap-3">
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-neon-green" />
            <span className="text-muted-foreground/70 text-xs">AI agents running 24/7 · 500+ jobs scanned weekly</span>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(at 50% 50%, rgba(124,58,237,0.04) 0px, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #22d3ee)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #22d3ee)' }}>
              AI Job Platform
            </span>
          </div>

          <h1 className="text-2xl font-black text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-7">
            No account?{' '}
            <Link href="/signup" className="text-neon-purple hover:text-neon-cyan font-semibold transition-colors">Sign up free →</Link>
          </p>

          {/* Demo button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neon-purple/30 bg-neon-purple/10 text-neon-purple text-sm font-bold hover:bg-neon-purple/15 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all mb-3 disabled:opacity-60"
          >
            {isDemoLoading
              ? <><div className="w-4 h-4 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />Loading demo...</>
              : <><Sparkles className="w-4 h-4" />Try Demo — No sign-up needed</>
            }
          </motion.button>

          {/* Google */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl transition-all mb-6 text-sm font-medium ${
              googleEnabled
                ? 'border-border text-foreground/70 hover:text-foreground hover:bg-muted/40 hover:border-border/80'
                : 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
            {!googleEnabled && <span className="text-xs text-muted-foreground">(not configured)</span>}
          </motion.button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-muted-foreground bg-[var(--s-auth)]">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-2 block text-muted-foreground uppercase tracking-wider">Email address</label>
              <NeonInput {...register('email')} icon={Mail} type="email" placeholder="john@example.com" error={!!errors.email} />
              {errors.email && <p className="text-destructive text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-neon-purple hover:text-neon-cyan transition-colors font-medium">Forgot password?</Link>
              </div>
              <NeonInput
                {...register('password')}
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                error={!!errors.password}
                rightSlot={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {errors.password && <p className="text-destructive text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              whileHover={{ boxShadow: '0 0 28px rgba(124,58,237,0.4)' }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #06b6d4 100%)' }}
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                : <>Sign in <ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>
          </form>

          <p className="text-center text-xs text-muted-foreground/60 mt-8">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="hover:text-muted-foreground transition-colors underline">Terms</Link> and{' '}
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors underline">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
