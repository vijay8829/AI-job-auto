import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function validateEnv(config: ConfigService, logger: any) {
  const required = [
    ['JWT_SECRET', 'JWT access token signing key'],
    ['JWT_REFRESH_SECRET', 'JWT refresh token signing key'],
    ['ENCRYPTION_KEY', 'Credential encryption key'],
    ['DATABASE_URL', 'PostgreSQL connection string'],
    ['REDIS_URL', 'Redis connection string'],
  ];
  const missing: string[] = [];
  for (const [key, desc] of required) {
    const val = config.get<string>(key);
    if (!val) missing.push(`  ${key} — ${desc}`);
  }
  if (missing.length) {
    logger.error(`Missing required environment variables:\n${missing.join('\n')}\nAborting startup.`, 'Bootstrap');
    process.exit(1);
  }
  // Warn about weak secrets (dev defaults)
  const jwtSecret = config.get<string>('JWT_SECRET', '');
  if (jwtSecret.length < 32) {
    logger.warn('JWT_SECRET is too short (< 32 chars) — use a secure random value in production', 'Bootstrap');
  }
  const encKey = config.get<string>('ENCRYPTION_KEY', '');
  if (encKey.length < 32) {
    logger.warn('ENCRYPTION_KEY is too short (< 32 chars) — use a secure random value in production', 'Bootstrap');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  validateEnv(config, logger);

  // Sentry — only active when DSN is set (skip in local dev)
  const sentryDsn = config.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get('NODE_ENV', 'development'),
      tracesSampleRate: config.get('NODE_ENV') === 'production' ? 0.1 : 0,
    });
    logger.log('Sentry initialized', 'Bootstrap');
  }

  const isProd = config.get('NODE_ENV') === 'production';

  // Request-ID — attach before everything else so every log can correlate
  app.use((req: any, _res: any, next: () => void) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    next();
  });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  // Trust Cloudflare / reverse-proxy IP headers
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS — in development also allow Cloudflare quick-tunnel origins
  const allowedOrigins = [
    config.get('APP_URL', 'http://localhost:3000'),
    config.get('ADMIN_URL', 'http://localhost:3001'),
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Server-to-server requests (no Origin header) are always allowed
      if (!origin) return callback(null, true);
      // Exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Cloudflare quick tunnels (dev only)
      if (!isProd && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return callback(null, true);
      // Custom CORS_ORIGIN env (comma-separated extra origins)
      const extra = config.get<string>('CORS_ORIGIN', '').split(',').map((s) => s.trim()).filter(Boolean);
      if (extra.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // API versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger docs
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Job Platform API')
      .setDescription('Production-grade AI Job Application Automation Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('resumes', 'Resume upload and parsing')
      .addTag('jobs', 'Job search and aggregation')
      .addTag('applications', 'Job application tracking')
      .addTag('platforms', 'Job platform integrations')
      .addTag('automation', 'Browser automation engine')
      .addTag('analytics', 'Analytics and insights')
      .addTag('notifications', 'Notification management')
      .addTag('subscriptions', 'Subscription and billing')
      .addTag('admin', 'Admin panel')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  logger.log(`🚀 API running on http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
