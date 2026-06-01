export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type ExperienceLevel = 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'PRINCIPAL' | 'EXECUTIVE';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'FLEXIBLE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  subscription?: { plan: SubscriptionPlan; status: string };
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  headline?: string;
  summary?: string;
  phone?: string;
  location?: string;
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  experienceLevel?: ExperienceLevel;
  totalYearsExperience?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  profileCompleteness: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}
