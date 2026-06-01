export type ApplicationStatus =
  | 'PENDING' | 'APPLIED' | 'UNDER_REVIEW' | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED' | 'OFFER_RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'GHOSTED';

export type AutomationStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'NEEDS_REVIEW' | 'CAPTCHA_REQUIRED';
export type AutomationMode = 'SEMI_AUTO' | 'FULL_AUTO';

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId?: string;
  status: ApplicationStatus;
  coverLetter?: string;
  answers?: Record<string, string>;
  notes?: string;
  appliedAt?: string;
  respondedAt?: string;
  interviewDate?: string;
  isAutoApplied: boolean;
  aiMatchScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLog {
  id: string;
  userId: string;
  status: AutomationStatus;
  steps: ApplyStep[];
  currentStep?: string;
  totalSteps: number;
  completedSteps: number;
  screenshotUrls: string[];
  errorMessage?: string;
  durationMs?: number;
}

export interface ApplyStep {
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  timestamp: string;
  details?: string;
}
