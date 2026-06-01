import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('platforms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available job platforms' })
  getAllPlatforms() {
    return this.platformsService.getAllPlatforms();
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get user connected platform accounts' })
  getAccounts(@CurrentUser('id') userId: string) {
    return this.platformsService.getUserPlatformAccounts(userId);
  }

  @Post(':platformId/connect')
  @ApiOperation({ summary: 'Connect a job platform account' })
  connectPlatform(
    @CurrentUser('id') userId: string,
    @Param('platformId', ParseUUIDPipe) platformId: string,
    @Body() credentials: { username?: string; password?: string; accessToken?: string },
  ) {
    return this.platformsService.connectPlatform(userId, platformId, credentials);
  }

  @Delete(':platformId/disconnect')
  @ApiOperation({ summary: 'Disconnect a job platform account' })
  disconnectPlatform(
    @CurrentUser('id') userId: string,
    @Param('platformId', ParseUUIDPipe) platformId: string,
  ) {
    return this.platformsService.disconnectPlatform(userId, platformId);
  }

  @Post(':platformId/inject-cookies')
  @ApiOperation({ summary: 'Inject real browser session cookies to bypass bot detection' })
  async injectCookies(
    @CurrentUser('id') userId: string,
    @Param('platformId', ParseUUIDPipe) platformId: string,
    @Body('cookies') cookies: any[],
  ) {
    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new BadRequestException('cookies must be a non-empty array');
    }
    return this.platformsService.injectSessionCookies(userId, platformId, cookies);
  }
}
