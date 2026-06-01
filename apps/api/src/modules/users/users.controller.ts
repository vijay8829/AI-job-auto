import { Controller, Get, Put, Patch, Delete, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpdateUserDto {
  @IsOptional() name?: string;
  @IsOptional() title?: string;
  @IsOptional() location?: string;
  @IsOptional() bio?: string;
  @IsOptional() onboardingCompletedAt?: string;
}

class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() applicationSubmitted?: boolean;
  @IsOptional() @IsBoolean() applicationViewed?: boolean;
  @IsOptional() @IsBoolean() interviewInvite?: boolean;
  @IsOptional() @IsBoolean() jobMatches?: boolean;
  @IsOptional() @IsBoolean() weeklyDigest?: boolean;
  @IsOptional() @IsBoolean() productUpdates?: boolean;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user basic info' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage limits and current consumption' })
  getUsage(@CurrentUser('id') userId: string) {
    return this.usersService.getUsage(userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user full profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile (full replace)' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Patch user display fields (name, title, location, bio)' })
  patchUser(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.patchUser(userId, dto);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(userId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current user account' })
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}
