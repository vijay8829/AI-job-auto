import { Controller, Get, Patch, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications with optional status filter' })
  getApplications(@CurrentUser('id') userId: string, @Query('status') status?: string) {
    return this.applicationsService.getApplications(userId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats(@CurrentUser('id') userId: string) {
    return this.applicationsService.getDashboardStats(userId);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get application timeline data' })
  getTimeline(@CurrentUser('id') userId: string) {
    return this.applicationsService.getApplicationTimeline(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  getApplication(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.getApplication(userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status manually' })
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.applicationsService.updateStatus(userId, id, status, notes);
  }
}
