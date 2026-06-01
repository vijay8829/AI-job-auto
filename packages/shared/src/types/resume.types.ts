export type ResumeFormat = 'PDF' | 'DOCX' | 'TXT';
export type ParseStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Resume {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  fileUrl: string;
  format: ResumeFormat;
  isDefault: boolean;
  parseStatus: ParseStatus;
  parsedAt?: string;
  createdAt: string;
  parsedProfile?: ParsedProfile;
}

export interface ParsedProfile {
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  technologies: string[];
  keywords: string[];
  summary?: string;
  totalExperienceYears?: number;
  atsScore?: number;
  readabilityScore?: number;
  contactInfo?: ContactInfo;
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  skills: string[];
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface Project {
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}
