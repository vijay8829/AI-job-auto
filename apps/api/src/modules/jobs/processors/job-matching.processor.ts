import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { prisma } from '@ai-job/database';
import axios from 'axios';

@Processor('job-matching')
export class JobMatchingProcessor {
  private readonly logger = new Logger(JobMatchingProcessor.name);

  constructor(private readonly config: ConfigService) {}

  @Process('score-jobs')
  async scoreJobs(job: Job<{ userId: string; jobIds: string[] }>) {
    const { userId, jobIds } = job.data;

    const [parsedProfile, jobs] = await Promise.all([
      prisma.parsedProfile.findFirst({
        where: { resume: { userId, isDefault: true } },
      }),
      prisma.job.findMany({ where: { id: { in: jobIds } } }),
    ]);

    if (!parsedProfile) {
      this.logger.warn(`No parsed profile for user ${userId}, skipping scoring`);
      return;
    }

    const userProfile = await prisma.userProfile.findUnique({ where: { userId } });

    const aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');

    for (const jobItem of jobs) {
      try {
        const response = await axios.post(`${aiServiceUrl}/ai/score-job-match`, {
          parsed_profile: {
            skills: parsedProfile.skills,
            experience: parsedProfile.experience,
            education: parsedProfile.education,
            keywords: parsedProfile.keywords,
            total_experience_years: parsedProfile.totalExperienceYears,
            summary: (parsedProfile as any).summary,
          },
          user_preferences: {
            salary_min: userProfile?.salaryMin,
            salary_max: userProfile?.salaryMax,
            work_modes: userProfile?.workModes ?? [],
            preferred_locations: userProfile?.preferredLocations ?? [],
          },
          job: {
            id: jobItem.id,
            title: jobItem.title,
            description: jobItem.description,
            requirements: jobItem.requirements,
            skills: jobItem.skills,
            technologies: jobItem.technologies,
            salary_min: jobItem.salaryMin,
            salary_max: jobItem.salaryMax,
            work_mode: jobItem.workMode,
            location: jobItem.location,
            experience_level: jobItem.experienceLevel,
            keywords: jobItem.keywords,
          },
        });

        const score = response.data;

        await prisma.aiScore.upsert({
          where: { userId_jobId: { userId, jobId: jobItem.id } },
          create: {
            userId,
            jobId: jobItem.id,
            overallScore: score.overall_score,
            skillMatchScore: score.skill_match_score,
            experienceScore: score.experience_score,
            locationScore: score.location_score,
            salaryScore: score.salary_score,
            atsScore: score.ats_score,
            keywordScore: score.keyword_score,
            matchedSkills: score.matched_skills,
            missingSkills: score.missing_skills,
            matchReasons: score.match_reasons,
            improvements: score.improvements,
            recommendation: score.recommendation,
          },
          update: {
            overallScore: score.overall_score,
            skillMatchScore: score.skill_match_score,
            experienceScore: score.experience_score,
            locationScore: score.location_score,
            salaryScore: score.salary_score,
            atsScore: score.ats_score,
            keywordScore: score.keyword_score,
            matchedSkills: score.matched_skills,
            missingSkills: score.missing_skills,
            matchReasons: score.match_reasons,
            improvements: score.improvements,
            recommendation: score.recommendation,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to score job ${jobItem.id}: ${error.message}`);
      }
    }
  }
}
