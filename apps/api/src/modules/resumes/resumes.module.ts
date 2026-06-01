import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeParseProcessor } from './processors/resume-parse.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'resume-parsing' }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeParseProcessor],
  exports: [ResumesService],
})
export class ResumesModule {}
