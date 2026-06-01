import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@ai-job/database';
import axios from 'axios';

@Processor('resume-parsing')
export class ResumeParseProcessor {
  private readonly logger = new Logger(ResumeParseProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('parse-resume')
  async parseResume(job: Job<{ resumeId: string; userId: string; fileUrl: string; format: string }>) {
    const { resumeId, userId, fileUrl, format } = job.data;
    this.logger.log(`[PARSE:${resumeId}] Starting — format=${format} url=${fileUrl}`);

    await prisma.resume.update({ where: { id: resumeId }, data: { parseStatus: 'processing' } });

    const aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://ai-service:8000');

    try {
      // ── Stage 1: reach AI service ─────────────────────────────────────────
      this.logger.log(`[PARSE:${resumeId}] Stage 1: calling AI service at ${aiServiceUrl}/ai/parse-resume`);

      let response: any;
      try {
        // CRITICAL: FastAPI expects snake_case field names
        response = await axios.post(
          `${aiServiceUrl}/ai/parse-resume`,
          { resume_id: resumeId, file_url: fileUrl, format },
          { timeout: 120_000 },
        );
      } catch (httpErr: any) {
        const status = httpErr?.response?.status;
        const detail = JSON.stringify(httpErr?.response?.data);
        throw new Error(`AI service HTTP ${status}: ${detail || httpErr.message}`);
      }

      // ── Stage 2: map snake_case response → camelCase for Prisma ──────────
      this.logger.log(`[PARSE:${resumeId}] Stage 2: mapping AI response`);
      const d = response.data;

      // FastAPI returns snake_case; map every field explicitly so nothing is silently dropped
      const mapped = {
        rawText:             d.raw_text             ?? '',
        contactInfo:         d.contact_info         ?? {},
        summary:             d.summary              ?? null,
        skills:              d.skills               ?? [],
        experience:          d.experience           ?? [],
        education:           d.education            ?? [],
        certifications:      d.certifications       ?? [],
        projects:            d.projects             ?? [],
        technologies:        d.technologies         ?? [],
        keywords:            d.keywords             ?? [],
        languages:           d.languages            ?? [],
        totalExperienceYears: d.total_experience_years ?? null,
        atsScore:            d.ats_score            ?? null,
        readabilityScore:    d.readability_score    ?? null,
        keywordDensity:      d.keyword_density      ?? {},
      };

      this.logger.log(
        `[PARSE:${resumeId}] Stage 2: skills=${mapped.skills.length} atsScore=${mapped.atsScore} rawTextLen=${mapped.rawText.length}`,
      );

      // ── Stage 3: save parsed profile ──────────────────────────────────────
      this.logger.log(`[PARSE:${resumeId}] Stage 3: saving to database`);
      await prisma.parsedProfile.upsert({
        where: { resumeId },
        create: {
          resumeId,
          rawText:             mapped.rawText,
          contactInfo:         mapped.contactInfo,
          summary:             mapped.summary,
          skills:              mapped.skills,
          experience:          mapped.experience,
          education:           mapped.education,
          certifications:      mapped.certifications,
          projects:            mapped.projects,
          technologies:        mapped.technologies,
          keywords:            mapped.keywords,
          languages:           mapped.languages,
          totalExperienceYears: mapped.totalExperienceYears,
          atsScore:            mapped.atsScore,
          readabilityScore:    mapped.readabilityScore,
          keywordDensity:      mapped.keywordDensity,
          parsedAt:            new Date(),
        },
        update: {
          rawText:             mapped.rawText,
          contactInfo:         mapped.contactInfo,
          summary:             mapped.summary,
          skills:              mapped.skills,
          experience:          mapped.experience,
          education:           mapped.education,
          certifications:      mapped.certifications,
          projects:            mapped.projects,
          technologies:        mapped.technologies,
          keywords:            mapped.keywords,
          languages:           mapped.languages,
          totalExperienceYears: mapped.totalExperienceYears,
          atsScore:            mapped.atsScore,
          readabilityScore:    mapped.readabilityScore,
          keywordDensity:      mapped.keywordDensity,
          parsedAt:            new Date(),
          updatedAt:           new Date(),
        },
      });

      // ── Stage 4: mark resume as parsed ────────────────────────────────────
      await prisma.resume.update({
        where: { id: resumeId },
        data: { isParsed: true, parseStatus: 'completed', parsedAt: new Date() },
      });

      // ── Stage 5: sync skills/summary to user profile ──────────────────────
      await this.syncToUserProfile(userId, mapped);

      this.eventEmitter.emit('resume.parsed', { userId, resumeId });
      this.logger.log(`[PARSE:${resumeId}] COMPLETED — atsScore=${mapped.atsScore}`);

    } catch (error: any) {
      const msg = error?.message || String(error);
      this.logger.error(`[PARSE:${resumeId}] FAILED at stage: ${msg}`);
      await prisma.resume.update({
        where: { id: resumeId },
        data: { parseStatus: 'failed', parseError: msg },
      });
      throw error; // let Bull handle retry
    }
  }

  private async syncToUserProfile(userId: string, parsed: any) {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return;

    const updates: any = {};
    if (parsed.skills?.length > 0) {
      const existing = new Set<string>(profile.skills);
      (parsed.skills as string[]).forEach((s) => existing.add(s));
      updates.skills = Array.from(existing);
    }
    if (parsed.summary && !profile.summary) updates.summary = parsed.summary;
    if (parsed.totalExperienceYears != null && !profile.totalYearsExperience) {
      updates.totalYearsExperience = Math.floor(parsed.totalExperienceYears);
    }
    if (Object.keys(updates).length > 0) {
      await prisma.userProfile.update({ where: { userId }, data: updates });
      this.logger.log(`[PARSE] Synced ${Object.keys(updates).join(',')} to user profile ${userId}`);
    }
  }
}
