'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight, Zap, Target, Bot, BarChart3, Shield, CheckCircle,
  Sparkles, Brain, Cpu, Globe, Layers, TrendingUp, Users,
  ChevronRight, Play, Star, Activity,
} from 'lucide-react';
import { ParticleCanvas } from '@/components/ui/particle-canvas';

const features = [
  {
    icon: Bot, color: 'purple',
    title: 'AI Auto-Apply',
    desc: 'Automatically apply to hundreds of jobs with human-like browser automation across all major platforms.',
    stat: '500+ jobs/week',
  },
  {
    icon: Target, color: 'cyan',
    title: 'Smart Job Matching',
    desc: 'AI scores every job against your profile — see match percentage, missing skills, and why you should apply.',
    stat: '98% accuracy',
  },
  {
    icon: Zap, color: 'green',
    title: 'Resume Optimization',
    desc: 'AI tailors your resume for each application to maximize ATS scores and pass screening filters.',
    stat: '85% ATS pass rate',
  },
  {
    icon: BarChart3, color: 'blue',
    title: 'Application Analytics',
    desc: 'Track response rates, platform performance, and optimize your strategy with real-time data.',
    stat: 'Real-time insights',
  },
  {
    icon: Shield, color: 'pink',
    title: 'Secure & Private',
    desc: 'AES-256 encrypted credentials. You stay in control — review every application before final submission.',
    stat: 'Bank-grade security',
  },
  {
    icon: Globe, color: 'yellow',
    title: 'Multi-Platform',
    desc: 'LinkedIn, Indeed, Naukri, Glassdoor, Wellfound, Greenhouse, Lever — one platform for all.',
    stat: '7 platforms',
  },
];

const stats = [
  { value: '10x', label: 'More Applications', icon: TrendingUp, color: 'purple' },
  { value: '85%', label: 'ATS Pass Rate',      icon: Target,    color: 'cyan' },
  { value: '3hrs', label: 'Saved Daily',        icon: Zap,       color: 'green' },
  { value: '7',   label: 'Platforms',           icon: Globe,     color: 'blue' },
];

const colorMap: Record<string, { glow: string; border: string; bg: string; text: string; icon: string }> = {
  purple: { glow: 'shadow-neon-purple', border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'from-purple-600 to-violet-600' },
  cyan:   { glow: 'shadow-neon-cyan',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   icon: 'from-cyan-500 to-blue-500' },
  green:  { glow: 'shadow-neon-green',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  text: 'text-green-400',  icon: 'from-green-500 to-emerald-500' },
  blue:   { glow: 'shadow-neon-blue',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'from-blue-500 to-indigo-500' },
  pink:   { glow: 'shadow-[0_0_20px_rgba(244,114,182,0.4)]', border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-400', icon: 'from-pink-500 to-rose-500' },
  yellow: { glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',  border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: 'from-yellow-500 to-orange-500' },
};

function FloatingCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: 'easeOut' }}
      className={className}
      style={{ animation: `float ${6 + delay}s ease-in-out ${delay}s infinite` }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const step = target / 60;
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.round(cur));
      if (cur >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 400], [0, -60]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 inset-x-0 z-50 glass border-b border-purple-500/15"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9">
              <div className="w-9 h-9 rounded-xl gradient-brand-rich flex items-center justify-center shadow-lg group-hover:shadow-neon-purple transition-all duration-500">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-base gradient-text-cyber">NexusAI Jobs</span>
              <p className="text-[9px] text-purple-400/70 -mt-0.5 font-mono tracking-widest uppercase">Autonomous Apply</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {['Features', 'Pricing', 'About'].map((item) => (
              <Link key={item} href={item === 'Pricing' ? '/pricing' : `#${item.toLowerCase()}`}
                className="text-muted-foreground hover:text-purple-400 transition-colors duration-200 relative group">
                {item}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-purple-400 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup"
              className="relative overflow-hidden px-5 py-2 rounded-xl text-sm font-semibold text-white btn-brand group">
              <span className="relative z-10 flex items-center gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Particle background */}
        <div className="absolute inset-0">
          <ParticleCanvas />
        </div>

        {/* Neural grid */}
        <div className="absolute inset-0 neural-bg opacity-60" />

        {/* Ambient orbs */}
        <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-float-slow" />
        <div className="orb orb-cyan   w-[400px] h-[400px] top-1/4 -right-20 animate-float-delayed" />
        <div className="orb orb-green  w-[300px] h-[300px] bottom-0 left-1/3  animate-float" />

        {/* Scan line */}
        <div className="absolute inset-0 scan-line-wrapper pointer-events-none" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-brand text-purple-300 text-sm font-medium mb-8 border border-purple-500/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="h-2 w-2 rounded-full bg-purple-400" />
            </span>
            Powered by GPT-4o &amp; Autonomous Browser AI
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
            className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.05]"
          >
            <span className="text-white">Land Your</span>
            <br />
            <span className="gradient-text-cyber">Dream Job</span>
            <br />
            <span className="text-white">10</span>
            <span className="text-purple-400">×</span>
            <span className="text-white"> Faster</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your resume. Our AI finds, matches, and autonomously applies to hundreds
            of jobs across 7 platforms — while you sleep.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/signup"
              className="group relative overflow-hidden btn-brand-lg flex items-center gap-2.5 text-base">
              <Sparkles className="w-5 h-5 animate-pulse-slow" />
              Start Free — No Card Needed
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#demo"
              className="btn-outline flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold">
              <Play className="w-4 h-4 text-cyan-400" />
              Watch Demo
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {['V','A','K','R','S'].map((l, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background gradient-brand-rich flex items-center justify-center text-white text-xs font-bold" style={{ zIndex: 5-i }}>
                  {l}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
              </div>
              <span>2,400+ job seekers automated their search</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating UI preview cards */}
        <div className="absolute bottom-16 left-4 hidden xl:block">
          <FloatingCard delay={0.5} className="glass-card rounded-2xl p-4 w-56">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold text-green-400">LIVE</span>
              <span className="text-xs text-muted-foreground">Automation</span>
            </div>
            <p className="text-lg font-bold text-white">47 apps sent</p>
            <p className="text-xs text-muted-foreground">in the last 24 hours</p>
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-3/4 rounded-full gradient-ai animate-pulse" />
            </div>
          </FloatingCard>
        </div>

        <div className="absolute bottom-16 right-4 hidden xl:block">
          <FloatingCard delay={1} className="glass-card rounded-2xl p-4 w-56">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Match Score</span>
            </div>
            <p className="text-2xl font-black gradient-text-brand">94%</p>
            <p className="text-xs text-muted-foreground">Senior React Engineer @ Stripe</p>
            <div className="mt-2 flex gap-1 flex-wrap">
              {['React', 'TypeScript', 'Node.js'].map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/20">{s}</span>
              ))}
            </div>
          </FloatingCard>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50"
        >
          <span className="text-xs font-mono tracking-widest">SCROLL</span>
          <div className="w-5 h-8 border border-purple-500/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-purple-400 rounded-full animate-bounce-subtle" />
          </div>
        </motion.div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="relative py-20 border-y border-purple-500/10 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute inset-0 neural-bg-dense opacity-30" />
        <div className="relative max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card rounded-2xl p-6 card-interactive group"
            >
              <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${colorMap[s.color].icon}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div className={`text-4xl font-black mb-1 ${colorMap[s.color].text} group-hover:scale-110 transition-transform duration-300`}>
                {s.value}
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 neural-bg opacity-40" />
        <div className="orb orb-purple w-[500px] h-[500px] top-0 right-0 opacity-10" />
        <div className="orb orb-cyan w-[400px] h-[400px] bottom-0 left-0 opacity-10" />

        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="ai-status-badge mx-auto mb-4">
              <Cpu className="w-3 h-3" /> Platform Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 text-white">
              Everything to <span className="gradient-text">dominate</span>
              <br />your job search
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              One AI platform replaces hours of manual job hunting every single day.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const c = colorMap[f.color];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className={`ai-card rounded-2xl p-6 group cursor-pointer relative overflow-hidden`}
                >
                  {/* Hover glow sweep */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${c.bg} pointer-events-none`} />

                  <div className={`relative w-12 h-12 rounded-xl mb-5 flex items-center justify-center bg-gradient-to-br ${c.icon} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="relative font-bold text-lg text-white mb-2">{f.title}</h3>
                  <p className="relative text-sm text-muted-foreground leading-relaxed mb-4">{f.desc}</p>

                  <div className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${c.bg} ${c.text} ${c.border} border`}>
                    <Zap className="w-3 h-3" /> {f.stat}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-cyber" />
        <div className="absolute inset-0 dot-grid opacity-20" />

        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Up and running in <span className="gradient-text">3 steps</span>
            </h2>
            <p className="text-muted-foreground text-lg">From zero to automated job search in under 5 minutes.</p>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-px h-[calc(100%-80px)] hidden md:block"
              style={{ background: 'linear-gradient(180deg, #7c3aed, #06b6d4, #10b981)' }} />

            {[
              { step: '01', icon: Layers, title: 'Upload Your Resume', desc: 'Upload your resume and set your target roles, locations, and salary range. Our AI parses everything instantly.', color: 'purple' },
              { step: '02', icon: Brain,  title: 'AI Builds Your Profile', desc: 'Our AI extracts your skills, experience, and preferences to create an intelligent profile used for perfect job matching.', color: 'cyan' },
              { step: '03', icon: Zap,    title: 'Sit Back & Get Interviews', desc: 'AI applies to matched jobs 24/7. You get notified when interviews are scheduled. Review, approve, succeed.', color: 'green' },
            ].map((item, i) => {
              const c = colorMap[item.color];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className={`relative flex items-center gap-8 mb-12 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className={`flex-1 glass-card rounded-2xl p-8 ${i % 2 !== 0 ? 'md:text-right' : ''}`}>
                    <div className={`font-mono text-5xl font-black ${c.text} opacity-20 mb-3`}>{item.step}</div>
                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${c.icon} ${i % 2 !== 0 ? 'ml-auto' : ''}`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  <div className={`hidden md:flex w-12 h-12 rounded-full items-center justify-center shrink-0 bg-gradient-to-br ${c.icon} z-10 shadow-lg`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ───────────────────────────────────────────────────── */}
      <section className="relative py-20 px-4 border-y border-purple-500/10 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-mono text-purple-400 tracking-widest uppercase mb-6">Supported Platforms</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor', 'Wellfound', 'Greenhouse', 'Lever'].map((p, i) => (
                <motion.div
                  key={p}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="px-5 py-2.5 glass-card rounded-xl font-semibold text-sm text-white border border-purple-500/20 hover:border-purple-500/50 transition-colors"
                >
                  {p}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <ParticleCanvas />
        </div>
        <div className="absolute inset-0 neural-bg opacity-40" />
        <div className="orb orb-purple w-[700px] h-[700px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-12 border border-purple-500/25 glow-brand">
            <div className="ai-status-badge mx-auto mb-6">
              <Sparkles className="w-3 h-3 animate-pulse" /> Free to start
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
              Ready to let AI <br />
              <span className="gradient-text-cyber">handle it all?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              3 free applications per month. No credit card. No commitment.
              <br />Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-brand-lg flex items-center gap-2.5">
                <Sparkles className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="btn-outline px-8 py-4 rounded-2xl text-base font-semibold">
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground/60 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> No credit card</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Cancel anytime</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> GDPR compliant</span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-purple-500/10 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gradient-brand-rich rounded-xl flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm gradient-text-cyber">NexusAI Jobs</span>
              <p className="text-[9px] text-purple-400/60 font-mono tracking-widest">AUTONOMOUS · INTELLIGENT · FAST</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-purple-400 transition-colors">Terms</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">© 2025 NexusAI Jobs. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
