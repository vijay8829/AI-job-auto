import { WorkMode, EmploymentType, ExperienceLevel } from './user.types';

export type JobStatus = 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'EXPIRED';

export interface JobPlatform {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  baseUrl: string;
  supportsEasyApply: boolean;
  isActive: boolean;
}

export interface Job {
  id: string;
  platformId: string;
  externalId: string;
  externalUrl: string;
  applyUrl?: string;
  title: string;
  company: string;
  companyLogoUrl?: string;
  location?: string;
  country?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string;
  skills: string[];
  technologies: string[];
  keywords: string[];
  status: JobStatus;
  postedAt?: string;
  platform: Pick<JobPlatform, 'name' | 'displayName' | 'logoUrl'>;
  aiScores?: AiScore[];
}

export interface AiScore {
  overallScore: number;
  skillMatchScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  atsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReasons: Array<{ reason: string; impact: string; weight: number }>;
  improvements: string[];
  recommendation?: string;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  platformIds?: string[];
  page?: number;
  limit?: number;
}
