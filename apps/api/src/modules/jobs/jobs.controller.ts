import { Controller, Get, Post, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Search jobs across all connected platforms' })
  searchJobs(@CurrentUser('id') userId: string, @Query() dto: SearchJobsDto) {
    return this.jobsService.searchJobs(userId, dto);
  }

  @Get('matched')
  @ApiOperation({ summary: 'Get AI-matched jobs for current user' })
  getMatchedJobs(@CurrentUser('id') userId: string) {
    return this.jobsService.getMatchedJobs(userId);
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get personalized job recommendations' })
  getRecommended(@CurrentUser('id') userId: string) {
    return this.jobsService.getRecommendedJobs(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details' })
  getJob(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) jobId: string) {
    return this.jobsService.getJob(userId, jobId);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save/bookmark a job' })
  saveJob(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) jobId: string) {
    return this.jobsService.saveJob(userId, jobId);
  }

  @Post('search/trigger')
  @ApiOperation({ summary: 'Trigger live job search across platforms' })
  triggerSearch(
    @CurrentUser('id') userId: string,
    @Body('platforms') platforms?: string[],
  ) {
    return this.jobsService.triggerJobSearch(userId, platforms);
  }
}
