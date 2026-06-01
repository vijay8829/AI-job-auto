'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Zap, Target, Bot, BarChart3, Shield, CheckCircle } from 'lucide-react';

const features = [
  { icon: Bot, title: 'AI Auto-Apply', desc: 'Automatically apply to hundreds of jobs with human-like browser automation across all major platforms.' },
  { icon: Target, title: 'Smart Job Matching', desc: 'AI scores every job against your profile — see match percentage, missing skills, and why you should apply.' },
  { icon: Zap, title: 'Resume Optimization', desc: 'AI tailors your resume for each application to maximize ATS scores and pass screening filters.' },
  { icon: BarChart3, title: 'Application Analytics', desc: 'Track response rates, platform performance, and optimize your job search strategy with data.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your credentials are encrypted. You stay in control — review applications before final submission.' },
  { icon: CheckCircle, title: 'Multi-Platform', desc: 'LinkedIn, Indeed, Naukri, Glassdoor, Wellfound, Greenhouse, Lever — one platform to rule them all.' },
];

const stats = [
  { value: '10x', label: 'More Applications' },
  { value: '85%', label: 'ATS Pass Rate' },
  { value: '3hrs', label: 'Saved Per Day' },
  { value: '7', label: 'Platforms Supported' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Job Platform</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 gradient-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-950 rounded-full text-brand-600 dark:text-brand-400 text-sm font-medium mb-6 border border-brand-100 dark:border-brand-900">
              <Zap className="w-4 h-4" />
              AI-Powered Job Application Automation
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Land your dream job
              <span className="gradient-text block">10x faster</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload your resume. Let AI find, match, and apply to hundreds of relevant jobs automatically.
              You review, you approve, you interview.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="flex items-center gap-2 px-8 py-4 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-brand-500/25">
                Start for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#demo" className="flex items-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-accent transition-colors">
                Watch Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4 text-center">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="text-4xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to <span className="gradient-text">dominate</span> your job search</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">One platform replaces hours of manual job applications every day.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl border bg-card card-hover"
              >
                <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="p-12 rounded-3xl gradient-brand relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to automate your job search?</h2>
              <p className="text-white/80 mb-8 text-lg">Start free. No credit card required. Cancel anytime.</p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-foreground">AI Job Platform</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p>© 2025 AI Job Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
