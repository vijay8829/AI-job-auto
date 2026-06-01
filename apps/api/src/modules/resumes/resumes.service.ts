import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@ai-job/database';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class ResumesService {
  private readonly s3: S3Client;
  private readonly s3Public: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue('resume-parsing') private readonly parseQueue: Queue,
  ) {
    const internalEndpoint = config.get<string>('AWS_ENDPOINT');
    const presignEndpoint = config.get<string>('AWS_PRESIGN_URL') || config.get<string>('AWS_PUBLIC_URL');
    const region = config.get('AWS_REGION', 'us-east-1');
    const credentials = {
      accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'minioadmin'),
      secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
    };

    // Internal client — used for upload/delete inside Docker
    this.s3 = new S3Client({
      region,
      ...(internalEndpoint ? { endpoint: internalEndpoint, forcePathStyle: true } : {}),
      credentials,
    });

    // Public client — endpoint is browser-accessible; used only for presigned URL generation
    this.s3Public = new S3Client({
      region,
      ...(presignEndpoint ? { endpoint: presignEndpoint, forcePathStyle: true } : (internalEndpoint ? { endpoint: internalEndpoint, forcePathStyle: true } : {})),
      credentials,
    });

    this.bucket = config.get('AWS_S3_BUCKET', 'ai-job-platform-resumes');
    this.publicUrl = config.get<string>('AWS_PUBLIC_URL') || `https://${this.bucket}.s3.${region}.amazonaws.com`;
  }

  async uploadResume(userId: string, file: Express.Multer.File, name?: string) {
    const usageLimit = await prisma.usageLimit.findUnique({ where: { userId } });
    if (usageLimit && usageLimit.resumeUploads >= usageLimit.resumeUploadsLimit) {
      throw new ForbiddenException('Resume upload limit reached. Please upgrade your plan.');
    }

    const format = this.getResumeFormat(file.mimetype, file.originalname);
    const fileKey = `resumes/${userId}/${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;

    // Upload to S3
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: { userId, originalName: file.originalname },
    }));

    const fileUrl = `${this.publicUrl}/${this.bucket}/${fileKey}`;

    const resume = await prisma.resume.create({
      data: {
        userId,
        name: name || file.originalname.replace(/\.[^/.]+$/, ''),
        originalFileName: file.originalname,
        fileUrl,
        fileKey,
        fileSize: file.size,
        format,
        parseStatus: 'pending',
      },
    });

    // Increment usage
    await prisma.usageLimit.update({
      where: { userId },
      data: { resumeUploads: { increment: 1 } },
    });

    // Queue parsing job
    await this.parseQueue.add('parse-resume', { resumeId: resume.id, userId, fileUrl, format }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      priority: 1,
    });

    return resume;
  }

  async getResumes(userId: string) {
    return prisma.resume.findMany({
      where: { userId },
      include: { parsedProfile: { select: { skills: true, atsScore: true, readabilityScore: true, totalExperienceYears: true, parsedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getResume(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: { parsedProfile: true },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async getParsedProfile(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');

    const parsed = await prisma.parsedProfile.findUnique({ where: { resumeId } });
    if (!parsed) throw new NotFoundException('Resume has not been parsed yet');

    return parsed;
  }

  async setDefaultResume(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');

    await prisma.resume.updateMany({ where: { userId }, data: { isDefault: false } });
    return prisma.resume.update({ where: { id: resumeId }, data: { isDefault: true } });
  }

  async deleteResume(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: resume.fileKey }));
    await prisma.resume.delete({ where: { id: resumeId } });
    await prisma.usageLimit.update({
      where: { userId },
      data: { resumeUploads: { decrement: 1 } },
    });
    return { message: 'Resume deleted successfully' };
  }

  async getPresignedUploadUrl(userId: string, filename: string, contentType: string) {
    const fileKey = `resumes/${userId}/${uuidv4()}-${filename.replace(/\s+/g, '_')}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: fileKey, ContentType: contentType });
    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl: signedUrl, fileKey };
  }

  async getPresignedDownloadUrl(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');
    // Use s3Public so the URL uses the browser-accessible hostname
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: resume.fileKey });
    const url = await getSignedUrl(this.s3Public, command, { expiresIn: 900 });
    return { downloadUrl: url, filename: resume.originalFileName };
  }

  async tailorResume(userId: string, resumeId: string, jobId: string) {
    const [resume, job] = await Promise.all([
      prisma.resume.findFirst({ where: { id: resumeId, userId }, include: { parsedProfile: true } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!resume) throw new NotFoundException('Resume not found');
    if (!job) throw new NotFoundException('Job not found');
    if (!resume.parsedProfile) throw new BadRequestException('Resume must be parsed before tailoring');

    // Call AI service for tailoring
    const aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
    const response = await axios.post(`${aiServiceUrl}/ai/tailor-resume`, {
      parsedProfile: resume.parsedProfile,
      jobDescription: job.description,
      jobRequirements: job.requirements,
      jobSkills: job.skills,
    });

    const { tailoredContent, coverLetter, atsScore, addedKeywords, changes } = response.data;

    return prisma.tailoredResume.create({
      data: {
        resumeId,
        jobId,
        name: `${resume.name} - ${job.company} (${job.title})`,
        content: tailoredContent,
        coverLetter,
        atsScore,
        addedKeywords,
        changes,
      },
    });
  }

  async reparseResume(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');

    await prisma.resume.update({
      where: { id: resumeId },
      data: { parseStatus: 'pending', parseError: null, parsedAt: null },
    });

    await this.parseQueue.add(
      'parse-resume',
      { resumeId: resume.id, userId, fileUrl: resume.fileUrl, format: resume.format },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, priority: 1 },
    );

    return { message: 'Resume re-queued for parsing', resumeId };
  }

  private getResumeFormat(mimetype: string, filename: string): 'PDF' | 'DOCX' | 'TXT' {
    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) return 'PDF';
    if (mimetype.includes('wordprocessingml') || filename.endsWith('.docx')) return 'DOCX';
    return 'TXT';
  }
}
