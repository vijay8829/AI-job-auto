'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Bot, ArrowRight, User, Mail, Lock, CheckCircle2, Shield, Zap, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { ParticleCanvas } from '@/components/ui/particle-canvas';

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[@$!%*?&]/, 'Must contain at least one special character (@$!%*?&)'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

const FEATURES = [
  { icon: Zap,          color: '#a855f7', title: 'AI-Powered Matching',  desc: 'Finds jobs that fit your profile across 7+ platforms' },
  { icon: BarChart3,    color: '#22d3ee', title: 'Resume Optimization',  desc: 'Auto-tailors your resume for each application' },
  { icon: Shield,       color: '#34d399', title: 'Anti-Detection Bots',  desc: 'Human-like browser automation with stealth mode' },
  { icon: CheckCircle2, color: '#f472b6', title: '3 Free Applications',  desc: 'Start immediately — no credit card required' },
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

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome to AI Job Platform.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    if (process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'true') {
      toast.error('Google Sign-In is not configured yet.');
      return;
    }
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

  return (
    <div className="min-h-screen flex bg-background" style={{ background: 'var(--s-auth)' }}>

      {/* ── Left panel — showcase (lg+) ── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-center px-12 xl:px-14">
        <ParticleCanvas className="opacity-50 dark:opacity-50" />

        {/* Neural grid */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(at 20% 40%, rgba(34,211,238,0.08) 0px, transparent 60%), radial-gradient(at 80% 70%, rgba(124,58,237,0.10) 0px, transparent 50%)' }} />

        {/* Ambient orbs */}
        <div className="absolute top-16 right-8 w-64 h-64 rounded-full blur-3xl animate-float-slow opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.6), transparent 70%)' }} />
        <div className="absolute bottom-16 left-8 w-48 h-48 rounded-full blur-3xl animate-float opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-border/30"
              style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.4), rgba(124,58,237,0.3))', backdropFilter: 'blur(12px)' }}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #a855f7)' }}>
                AI Job Platform
              </span>
              <p className="text-muted-foreground text-xs mt-0.5">No credit card required</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-4xl xl:text-5xl font-black text-foreground mb-4 leading-tight">
              Land your dream job{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #34d399)' }}>
                10× faster
              </span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Join thousands using AI to automate their search<br />
              and land more interviews.
            </p>
          </motion.div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.09 }}
                className="rounded-xl p-4 border border-border/50 bg-muted/20 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-foreground/90 text-xs font-bold mb-1">{title}</p>
                <p className="text-muted-foreground text-[10px] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-8 flex items-center gap-3">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-neon-cyan" />
            <span className="text-muted-foreground/70 text-xs">Secure · Private · No spam</span>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-y-auto py-8">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(at 50% 50%, rgba(34,211,238,0.03) 0px, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #7c3aed)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #a855f7)' }}>
              AI Job Platform
            </span>
          </div>

          <h1 className="text-2xl font-black text-foreground mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-7">
            Already have an account?{' '}
            <Link href="/login" className="text-neon-cyan hover:text-neon-purple font-semibold transition-colors">Sign in →</Link>
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleSignup}
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
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-muted-foreground bg-[var(--s-auth)]">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-2 block text-muted-foreground uppercase tracking-wider">First name</label>
                <NeonInput {...register('firstName')} icon={User} type="text" placeholder="John" autoComplete="given-name" error={!!errors.firstName} />
                {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold mb-2 block text-muted-foreground uppercase tracking-wider">Last name</label>
                <NeonInput {...register('lastName')} icon={User} type="text" placeholder="Doe" autoComplete="family-name" error={!!errors.lastName} />
                {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold mb-2 block text-muted-foreground uppercase tracking-wider">Email address</label>
              <NeonInput {...register('email')} icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" error={!!errors.email} />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold mb-2 block text-muted-foreground uppercase tracking-wider">Password</label>
              <NeonInput
                {...register('password')}
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                error={!!errors.password}
                rightSlot={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-[10px] font-bold mb-2 block text-muted-foreground uppercase tracking-wider">Confirm password</label>
              <NeonInput
                {...register('confirmPassword')}
                icon={Lock}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                rightSlot={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              whileHover={{ boxShadow: '0 0 28px rgba(34,211,238,0.35)' }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 60%, #a855f7 100%)' }}
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
                : <>Create free account <ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>
          </form>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline hover:text-muted-foreground transition-colors">Terms of Service</Link>{' '}and{' '}
            <Link href="/privacy" className="underline hover:text-muted-foreground transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
