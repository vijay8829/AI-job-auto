import { IsOptional, IsString, IsArray, IsInt, IsEnum, IsBoolean, IsUrl, Min, Max, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class WorkExperienceDto {
  @IsString() company: string;
  @IsString() title: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() skills?: string[];
}

class EducationDto {
  @IsString() institution: string;
  @IsString() degree: string;
  @IsOptional() @IsString() fieldOfStudy?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() grade?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsArray() preferredRoles?: string[];
  @IsOptional() @IsArray() preferredLocations?: string[];
  @IsOptional() @IsArray() workModes?: string[];
  @IsOptional() @IsArray() employmentTypes?: string[];
  @IsOptional() @IsEnum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE']) experienceLevel?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) totalYearsExperience?: number;
  @IsOptional() @IsInt() @Min(0) salaryMin?: number;
  @IsOptional() @IsInt() @Min(0) salaryMax?: number;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() @IsBoolean() willingToRelocate?: boolean;
  @IsOptional() @IsBoolean() openToWork?: boolean;
  @IsOptional() @IsUrl() linkedinUrl?: string;
  @IsOptional() @IsUrl() githubUrl?: string;
  @IsOptional() @IsUrl() portfolioUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkExperienceDto) workExperiences?: WorkExperienceDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationDto) educations?: EducationDto[];
  @IsOptional() @IsArray() certifications?: any[];
}
