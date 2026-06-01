import {
  Controller, Get, Post, Delete, Patch, Param, Body,
  UseInterceptors, UploadedFile, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsageLimitGuard, CheckUsageLimit } from '../../common/guards/usage-limit.guard';
import { memoryStorage } from 'multer';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user resumes' })
  getResumes(@CurrentUser('id') userId: string) {
    return this.resumesService.getResumes(userId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new resume (PDF/DOCX)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_, file, cb) => {
      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      cb(null, allowed.includes(file.mimetype));
    },
  }))
  uploadResume(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.resumesService.uploadResume(userId, file, name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume' })
  getResume(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.getResume(userId, resumeId);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get a presigned download URL for a resume (15 min TTL)' })
  getDownloadUrl(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.getPresignedDownloadUrl(userId, resumeId);
  }

  @Get(':id/parsed')
  @ApiOperation({ summary: 'Get parsed profile data for a resume' })
  getParsedProfile(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.getParsedProfile(userId, resumeId);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set a resume as the default' })
  setDefault(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.setDefaultResume(userId, resumeId);
  }

  @Post(':id/tailor/:jobId')
  @UseGuards(UsageLimitGuard)
  @CheckUsageLimit('aiOptimizations')
  @ApiOperation({ summary: 'AI-tailor a resume for a specific job' })
  tailorResume(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) resumeId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.resumesService.tailorResume(userId, resumeId, jobId);
  }

  @Post(':id/reparse')
  @ApiOperation({ summary: 'Re-queue a failed resume for parsing' })
  reparseResume(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.reparseResume(userId, resumeId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume' })
  deleteResume(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) resumeId: string) {
    return this.resumesService.deleteResume(userId, resumeId);
  }
}
