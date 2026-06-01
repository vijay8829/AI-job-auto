'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plug, Settings2, Search, Bot, ChevronRight, Check,
  Upload, Loader2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

const STEPS = [
  {
    id: 'welcome',
    icon: Bot,
    title: 'Welcome to AI Job Platform',
    description: "Let's get you set up in 5 minutes so the platform can start finding and applying to jobs for you.",
    cta: 'Get Started',
  },
  {
    id: 'resume',
    icon: FileText,
    title: 'Upload Your Resume',
    description: 'Upload your resume (PDF or Word doc) so the AI can parse your skills and tailor it for each application.',
    cta: 'Upload & Continue',
    skipLabel: 'Skip for now',
    hasUpload: true,
  },
  {
    id: 'connect',
    icon: Plug,
    title: 'Connect a Job Platform',
    description: 'Connect LinkedIn, Indeed, or Glassdoor so we can search and apply on your behalf.',
    cta: 'Connect Platform',
    href: '/integrations',
    skipLabel: 'Skip for now',
  },
  {
    id: 'preferences',
    icon: Settings2,
    title: 'Set Your Job Preferences',
    description: 'Tell us what roles, locations, and salary you are looking for. This improves matching accuracy.',
    cta: 'Set Preferences',
    href: '/settings',
    skipLabel: 'Skip for now',
  },
  {
    id: 'search',
    icon: Search,
    title: "You're All Set!",
    description: "Browse AI-matched jobs and review applications before they're submitted. The platform will notify you when it finds great matches.",
    cta: 'Go to Dashboard',
    href: '/dashboard',
  },
];

async function markOnboardingComplete() {
  try {
    await api.patch('/users/profile', { onboardingCompletedAt: new Date().toISOString() });
  } catch {}
  if (typeof window !== 'undefined') {
    localStorage.setItem('onboarding_done', '1');
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function complete() {
    await markOnboardingComplete();
    router.push('/dashboard');
  }

  async function handleResumeUpload(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name.replace(/\.[^.]+$/, ''));
      await api.post('/resumes/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadDone(true);
      await new Promise((r) => setTimeout(r, 800));
      setStep((s) => s + 1);
    } catch (e: any) {
      setUploadError(e?.response?.data?.message || 'Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function advance() {
    if (isLast) { await complete(); return; }
    setStep((s) => s + 1);
  }

  function skip() {
    setUploadError('');
    setStep((s) => s + 1);
  }

  const Icon = current.icon;
  const completedCount = step;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${i < step ? 'bg-brand-600 text-white scale-100' :
                    i === step ? 'bg-brand-600 text-white ring-4 ring-brand-200 dark:ring-brand-900 scale-110' :
                    'bg-muted text-muted-foreground scale-100'}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-10 h-0.5 mx-1 transition-colors duration-500 ${i < step ? 'bg-brand-600' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border bg-card p-8 shadow-lg text-center"
          >
            <div className={`w-16 h-16 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md transition-all
              ${uploadDone && current.id === 'resume' ? 'bg-green-500' : ''}`}>
              {uploadDone && current.id === 'resume'
                ? <Check className="w-8 h-8 text-white" />
                : <Icon className="w-8 h-8 text-white" />
              }
            </div>

            <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{current.description}</p>

            {/* Resume upload step */}
            {current.hasUpload && (
              <div className="mb-6">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResumeUpload(f);
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-muted-foreground/30 hover:border-brand-400 rounded-xl p-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <><Loader2 className="w-8 h-8 text-brand-600 animate-spin" /><span className="text-sm text-muted-foreground">Uploading…</span></>
                  ) : uploadDone ? (
                    <><Check className="w-8 h-8 text-green-500" /><span className="text-sm text-green-600 font-semibold">Uploaded successfully!</span></>
                  ) : (
                    <><Upload className="w-8 h-8 text-brand-600" /><span className="text-sm font-semibold">Click to upload PDF, DOC, or DOCX</span><span className="text-xs text-muted-foreground">Max 10 MB</span></>
                  )}
                </button>
                {uploadError && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {current.href && !current.hasUpload ? (
                <Link
                  href={current.href}
                  onClick={advance}
                  className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
                >
                  {current.cta}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : !current.hasUpload ? (
                <button
                  onClick={advance}
                  className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
                >
                  {current.cta}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}

              {current.skipLabel && (
                <button
                  onClick={skip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {current.skipLabel}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < STEPS.length - 1 && (
          <button
            onClick={complete}
            className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Skip setup and go to dashboard
          </button>
        )}
      </div>
    </div>
  );
}
