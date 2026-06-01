import { Controller, Get, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide statistics' })
  getStats() { return this.adminService.getSystemStats(); }

  @Get('analytics')
  @ApiOperation({ summary: 'Get admin analytics' })
  getAnalytics() { return this.analyticsService.getAdminAnalytics(); }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Patch('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user' })
  deactivateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Get('platforms')
  @ApiOperation({ summary: 'Get all platform configurations' })
  getPlatforms() { return this.adminService.getPlatforms(); }

  @Patch('platforms/:id')
  @ApiOperation({ summary: 'Update platform configuration' })
  updatePlatform(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
    return this.adminService.updatePlatform(id, data);
  }
}
