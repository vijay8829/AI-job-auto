import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartAutomationDto {
  @ApiProperty() @IsUUID() jobId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() resumeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverLetter?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() answers?: Record<string, string>;
  @ApiPropertyOptional({ enum: ['SEMI_AUTO', 'FULL_AUTO'], default: 'SEMI_AUTO' })
  @IsOptional() @IsEnum(['SEMI_AUTO', 'FULL_AUTO']) mode?: 'SEMI_AUTO' | 'FULL_AUTO' = 'SEMI_AUTO';
}
