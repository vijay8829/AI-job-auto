/**
 * Standalone Bull queue worker process.
 * Loads the full AppModule (all processors) but binds to WORKER_PORT (4001)
 * so it doesn't conflict with the HTTP API on port 4000.
 *
 * Run via: node apps/api/dist/worker
 * Docker:  command: node apps/api/dist/worker
 */
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const sentryDsn = config.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get('NODE_ENV', 'production'),
    });
  }

  // Worker binds on a separate port so it can coexist with the API on the same host
  const port = config.get<number>('WORKER_PORT', 4001);
  await app.listen(port, '0.0.0.0');
  logger.log(`🔧 Worker process running on port ${port}`, 'Worker');
  logger.log('📬 Listening to queues: auto-apply, resume-parsing, job-matching, job-scraping', 'Worker');
}

bootstrap();
