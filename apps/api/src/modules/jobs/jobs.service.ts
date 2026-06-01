import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@ai-job/database';
import { SearchJobsDto } from './dto/search-jobs.dto';
import axios from 'axios';

@Injectable()
export class JobsService {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue('job-matching') private readonly matchingQueue: Queue,
    @InjectQueue('job-scraping') private readonly scrapingQueue: Queue,
  ) {}

  async searchJobs(userId: string, dto: SearchJobsDto) {
    const { query, page = 1, limit = 20 } = dto;

    if (query && query.trim()) {
      return this.fullTextSearch(userId, dto);
    }

    const {
      location, workMode, employmentType,
      experienceLevel, salaryMin, salaryMax, platformIds,
    } = dto;

    const where: any = { status: 'ACTIVE' };

    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (workMode) where.workMode = workMode;
    if (employmentType) where.employmentType = employmentType;
    if (experienceLevel) where.experienceLevel = experienceLevel;
    if (salaryMin) where.salaryMax = { gte: salaryMin };
    if (salaryMax) where.salaryMin = { lte: salaryMax };
    if (platformIds?.length) where.platformId = { in: platformIds };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          platform: { select: { name: true, displayName: true, logoUrl: true } },
          aiScores: {
            where: { userId },
            select: { overallScore: true, skillMatchScore: true, matchedSkills: true, missingSkills: true },
            take: 1,
          },
          _count: { select: { applications: true } },
        },
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    const unscoredJobIds = jobs.filter((j) => j.aiScores.length === 0).map((j) => j.id);
    if (unscoredJobIds.length > 0) {
      await this.matchingQueue.add('score-jobs', { userId, jobIds: unscoredJobIds }, { attempts: 2, backoff: { type: 'fixed', delay: 3000 }, priority: 5 });
    }

    return { jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private async fullTextSearch(userId: string, dto: SearchJobsDto) {
    const {
      query, location, workMode, employmentType,
      experienceLevel, salaryMin, salaryMax, platformIds,
      page = 1, limit = 20,
    } = dto;

    // Build WHERE clauses for filters (appended to the text search)
    const conditions: string[] = [`j.status = 'ACTIVE'`];
    const bindings: any[] = [];
    let bindIdx = 2; // $1 is the tsquery

    if (location) { conditions.push(`j.location ILIKE $${bindIdx++}`); bindings.push(`%${location}%`); }
    if (workMode) { conditions.push(`j.work_mode = $${bindIdx++}`); bindings.push(workMode); }
    if (employmentType) { conditions.push(`j.employment_type = $${bindIdx++}`); bindings.push(employmentType); }
    if (experienceLevel) { conditions.push(`j.experience_level = $${bindIdx++}`); bindings.push(experienceLevel); }
    if (salaryMin) { conditions.push(`j.salary_max >= $${bindIdx++}`); bindings.push(salaryMin); }
    if (salaryMax) { conditions.push(`j.salary_min <= $${bindIdx++}`); bindings.push(salaryMax); }
    if (platformIds?.length) { conditions.push(`j.platform_id = ANY($${bindIdx++}::uuid[])`); bindings.push(platformIds); }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Use plainto_tsquery so arbitrary user input never breaks the query
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        j.id, j.title, j.company, j.location, j.work_mode AS "workMode",
        j.employment_type AS "employmentType", j.experience_level AS "experienceLevel",
        j.salary_min AS "salaryMin", j.salary_max AS "salaryMax", j.salary_currency AS "salaryCurrency",
        j.skills, j.technologies, j.posted_at AS "postedAt", j.created_at AS "createdAt",
        j.external_url AS "externalUrl", j.apply_url AS "applyUrl", j.status,
        j.company_logo_url AS "companyLogoUrl",
        jp.name AS "platformName", jp.display_name AS "platformDisplayName", jp.logo_url AS "platformLogoUrl",
        ts_rank(
          to_tsvector('english', coalesce(j.title,'') || ' ' || coalesce(j.company,'') || ' ' || coalesce(j.description,'')),
          plainto_tsquery('english', $1)
        ) AS rank
      FROM jobs j
      LEFT JOIN job_platforms jp ON jp.id = j.platform_id
      WHERE ${whereClause}
        AND to_tsvector('english', coalesce(j.title,'') || ' ' || coalesce(j.company,'') || ' ' || coalesce(j.description,''))
            @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, j.posted_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `, query, ...bindings);

    const [countRow] = await prisma.$queryRawUnsafe<[{ count: string }]>(`
      SELECT COUNT(*)::text AS count FROM jobs j
      WHERE ${whereClause}
        AND to_tsvector('english', coalesce(j.title,'') || ' ' || coalesce(j.company,'') || ' ' || coalesce(j.description,''))
            @@ plainto_tsquery('english', $1)
    `, query, ...bindings);

    const total = parseInt(countRow.count, 10);

    // Attach AI scores
    const jobIds = rows.map((r) => r.id);
    const aiScores = jobIds.length
      ? await prisma.aiScore.findMany({
          where: { userId, jobId: { in: jobIds } },
          select: { jobId: true, overallScore: true, skillMatchScore: true, matchedSkills: true, missingSkills: true },
        })
      : [];
    const scoreMap = new Map(aiScores.map((s) => [s.jobId, s]));

    const jobs = rows.map(({ platformName, platformDisplayName, platformLogoUrl, ...j }) => ({
      ...j,
      platform: { name: platformName, displayName: platformDisplayName, logoUrl: platformLogoUrl },
      aiScores: scoreMap.has(j.id) ? [scoreMap.get(j.id)] : [],
    }));

    const unscoredJobIds = jobs.filter((j) => j.aiScores.length === 0).map((j) => j.id);
    if (unscoredJobIds.length > 0) {
      await this.matchingQueue.add('score-jobs', { userId, jobIds: unscoredJobIds }, { attempts: 2, backoff: { type: 'fixed', delay: 3000 }, priority: 5 });
    }

    return { jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getJob(userId: string, jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        platform: true,
        aiScores: { where: { userId }, take: 1 },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async getMatchedJobs(userId: string, limit = 20) {
    const scores = await prisma.aiScore.findMany({
      where: { userId, overallScore: { gte: 60 } },
      include: {
        job: {
          include: { platform: { select: { name: true, displayName: true, logoUrl: true } } },
        },
      },
      orderBy: { overallScore: 'desc' },
      take: limit,
    });

    return scores.map((s) => ({ ...s.job, aiScore: s }));
  }

  async triggerJobSearch(userId: string, platforms?: string[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { select: { preferredRoles: true, preferredLocations: true, workModes: true, skills: true } } },
    });

    const activePlatforms = await prisma.platformAccount.findMany({
      where: { userId, isActive: true, ...(platforms?.length ? { platformId: { in: platforms } } : {}) },
      include: { platform: true },
    });

    for (const account of activePlatforms) {
      await this.scrapingQueue.add(
        'scrape-jobs',
        {
          userId,
          platformId: account.platformId,
          platformName: account.platform.name,
          searchParams: {
            roles: user?.profile?.preferredRoles || [],
            locations: user?.profile?.preferredLocations || [],
            workModes: user?.profile?.workModes || [],
            skills: user?.profile?.skills || [],
          },
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 10000 }, priority: 3 },
      );
    }

    return { queued: activePlatforms.length, message: 'Job search triggered across platforms' };
  }

  async saveJob(userId: string, jobId: string) {
    // For now store as a saved/bookmarked application with PENDING status
    const existing = await prisma.application.findFirst({ where: { userId, jobId } });
    if (existing) return existing;

    return prisma.application.create({
      data: { userId, jobId, status: 'PENDING' },
    });
  }

  async getRecommendedJobs(userId: string) {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        OR: profile.skills.length > 0
          ? [{ skills: { hasSome: profile.skills } }, { technologies: { hasSome: profile.skills } }]
          : undefined,
        applications: { none: { userId } },
      },
      include: {
        platform: { select: { name: true, displayName: true, logoUrl: true } },
        aiScores: { where: { userId }, select: { overallScore: true }, take: 1 },
      },
      orderBy: { postedAt: 'desc' },
      take: 10,
    });
  }
}
