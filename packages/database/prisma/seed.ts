import { PrismaClient, PlatformType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed job platforms
  const platforms = [
    { name: 'linkedin', type: PlatformType.LINKEDIN, displayName: 'LinkedIn', baseUrl: 'https://www.linkedin.com', connectorClass: 'LinkedInConnector', supportsEasyApply: true, rateLimitMs: 3000 },
    { name: 'indeed', type: PlatformType.INDEED, displayName: 'Indeed', baseUrl: 'https://www.indeed.com', connectorClass: 'IndeedConnector', supportsEasyApply: false, rateLimitMs: 2000 },
    { name: 'naukri', type: PlatformType.NAUKRI, displayName: 'Naukri', baseUrl: 'https://www.naukri.com', connectorClass: 'NaukriConnector', supportsEasyApply: true, rateLimitMs: 2500 },
    { name: 'glassdoor', type: PlatformType.GLASSDOOR, displayName: 'Glassdoor', baseUrl: 'https://www.glassdoor.com', connectorClass: 'GlassdoorConnector', supportsEasyApply: false, rateLimitMs: 3000 },
    { name: 'wellfound', type: PlatformType.WELLFOUND, displayName: 'Wellfound', baseUrl: 'https://wellfound.com', connectorClass: 'WellfoundConnector', supportsEasyApply: false, rateLimitMs: 2000 },
    { name: 'greenhouse', type: PlatformType.GREENHOUSE, displayName: 'Greenhouse', baseUrl: 'https://boards.greenhouse.io', connectorClass: 'GreenhouseConnector', supportsEasyApply: false, rateLimitMs: 1500 },
    { name: 'lever', type: PlatformType.LEVER, displayName: 'Lever', baseUrl: 'https://jobs.lever.co', connectorClass: 'LeverConnector', supportsEasyApply: false, rateLimitMs: 1500 },
  ];

  for (const platform of platforms) {
    await prisma.jobPlatform.upsert({
      where: { name: platform.name },
      update: {},
      create: { ...platform, config: {}, logoUrl: `/platforms/${platform.name}.svg`, searchUrl: platform.baseUrl + '/jobs' },
    });
  }
  console.log(`✅ Seeded ${platforms.length} job platforms`);

  // Seed admin user
  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@ai-job-platform.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@ai-job-platform.com',
      passwordHash: adminPasswordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, plan: 'ENTERPRISE', status: 'ACTIVE' },
  });

  await prisma.usageLimit.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      applicationsLimit: 99999,
      aiOptimizationsLimit: 99999,
      resumeUploadsLimit: 99999,
      platformConnectionsLimit: 99999,
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
  });

  console.log(`✅ Seeded admin user: ${admin.email}`);
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
