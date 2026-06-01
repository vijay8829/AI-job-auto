import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { Public } from './common/decorators/public.decorator';
import { RedisService } from './common/services/redis.service';
import { prisma } from '@ai-job/database';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private health: HealthCheckService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const endpoint = config.get<string>('AWS_ENDPOINT');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET', 'ai-job-platform-resumes');
  }

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
      () => this.checkStorage(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (err: any) {
      return { database: { status: 'down', message: err.message } };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.client.ping();
      return { redis: { status: pong === 'PONG' ? 'up' : 'down' } };
    } catch (err: any) {
      return { redis: { status: 'down', message: err.message } };
    }
  }

  private async checkStorage(): Promise<HealthIndicatorResult> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { storage: { status: 'up' } };
    } catch (err: any) {
      // 403 = bucket exists but no HeadBucket permission — still reachable
      if (err.name === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
        return { storage: { status: 'up', note: 'bucket reachable' } };
      }
      return { storage: { status: 'down', message: err.message } };
    }
  }
}
