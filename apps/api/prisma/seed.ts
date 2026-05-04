import { PrismaClient, UserRole, JobStatus, JobPriority, SyncAction, SyncResult } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load .env manually — seed runs outside NestJS, no ConfigModule available
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

// Validate required env vars before Prisma initialises
const EnvSchema = z.object({
  DATABASE_URL: z.url('DATABASE_URL must be a valid URL'),
  DIRECT_URL:   z.url('DIRECT_URL must be a valid URL'),
});

EnvSchema.parse(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────

const SEED = {
  users: [
    {
      id:                 '0197f8a0-0001-7000-8000-000000000001',
      username:           'alic.kovac',
      email:              'alic.kovac@a3service.ba',
      passwordHash:       '$2b$10$placeholderHashForSeedDataOnly.AAAAAAAAAAAAAAAAAAAAAA',
      role:               UserRole.MANAGER,
      languagePreference: 'bs',
      profile: {
        specialization:    'HVAC Systems Management',
        yearsExperience:   12,
        certificateNumber: 'BA-MGR-2014-0042',
        bio:               'Senior manager with 12 years in commercial HVAC.',
      },
    },
    {
      id:                 '0197f8a0-0001-7000-8000-000000000002',
      username:           'emir.basic',
      email:              'emir.basic@a3service.ba',
      passwordHash:       '$2b$10$placeholderHashForSeedDataOnly.AAAAAAAAAAAAAAAAAAAAAA',
      role:               UserRole.TECHNICIAN,
      languagePreference: 'bs',
      profile: {
        specialization:    'Boiler Installation & Repair',
        yearsExperience:   7,
        certificateNumber: 'BA-TECH-2018-0117',
        bio:               'Certified boiler technician, residential and commercial.',
      },
    },
    {
      id:                 '0197f8a0-0001-7000-8000-000000000003',
      username:           'nina.hadzic',
      email:              'nina.hadzic@a3service.ba',
      passwordHash:       '$2b$10$placeholderHashForSeedDataOnly.AAAAAAAAAAAAAAAAAAAAAA',
      role:               UserRole.TECHNICIAN,
      languagePreference: 'bs',
      profile: {
        specialization:    'Preventive Maintenance',
        yearsExperience:   4,
        certificateNumber: 'BA-TECH-2021-0089',
        bio:               'Specialist in scheduled maintenance and fault diagnostics.',
      },
    },
  ],

  clients: [
    {
      id:    '0197f8a0-0002-7000-8000-000000000001',
      name:  'Termograd d.o.o.',
      email: 'kontakt@termograd.ba',
      phone: '+38761100200',
      sites: [
        {
          id:                 '0197f8a0-0003-7000-8000-000000000001',
          rawAddress:         'Ul. Mustafe Pintola 2, 71000 Sarajevo',
          latitude:           43.8563,
          longitude:          18.4131,
          accessInstructions: 'Kod portira na ulazu, pitati za tehničku sobu B2.',
        },
      ],
    },
    {
      id:    '0197f8a0-0002-7000-8000-000000000002',
      name:  'Toplana Zenica d.d.',
      email: 'servis@toplana-zenica.ba',
      phone: '+38732401500',
      sites: [
        {
          id:                 '0197f8a0-0003-7000-8000-000000000002',
          rawAddress:         'Bulevar Kralja Tvrtka I 14, 72000 Zenica',
          latitude:           44.2028,
          longitude:          17.9078,
          accessInstructions: 'Prijaviti se na recepciji, pratiti oznake prema kotlarnici.',
        },
        {
          id:                 '0197f8a0-0003-7000-8000-000000000003',
          rawAddress:         'Ul. Zmaja od Bosne 3, 72000 Zenica',
          latitude:           44.1985,
          longitude:          17.9134,
          accessInstructions: null,
        },
      ],
    },
  ],

  jobs: [
    {
      id:                '0197f8a0-0004-7000-8000-000000000001',
      siteId:            '0197f8a0-0003-7000-8000-000000000001',
      technicianId:      '0197f8a0-0001-7000-8000-000000000002',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Ul. Mustafe Pintola 2, 71000 Sarajevo',
      scheduledDate:     new Date('2026-05-06T08:00:00.000Z'),
      status:            JobStatus.PENDING,
      priority:          JobPriority.ROUTINE,
      estimatedDuration: 120,
      notes:             'Godišnji servis kotla — provjera filtera i brener.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000002',
      siteId:            '0197f8a0-0003-7000-8000-000000000002',
      technicianId:      '0197f8a0-0001-7000-8000-000000000002',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Bulevar Kralja Tvrtka I 14, 72000 Zenica',
      scheduledDate:     new Date('2026-05-07T09:00:00.000Z'),
      status:            JobStatus.IN_PROGRESS,
      priority:          JobPriority.URGENT,
      estimatedDuration: 240,
      actualStartTime:   new Date('2026-05-07T09:12:00.000Z'),
      notes:             'Kvar na ekspanzijskoj posudi — hitna intervencija.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000003',
      siteId:            '0197f8a0-0003-7000-8000-000000000003',
      technicianId:      '0197f8a0-0001-7000-8000-000000000003',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Ul. Zmaja od Bosne 3, 72000 Zenica',
      scheduledDate:     new Date('2026-05-08T10:00:00.000Z'),
      status:            JobStatus.PENDING,
      priority:          JobPriority.MAINTENANCE,
      estimatedDuration: 90,
      notes:             'Redovni pregled — čišćenje izmjenjivača topline.',
    },
    {
      id:                '0197f8a0-0004-7000-8000-000000000004',
      siteId:            '0197f8a0-0003-7000-8000-000000000001',
      technicianId:      '0197f8a0-0001-7000-8000-000000000003',
      managerId:         '0197f8a0-0001-7000-8000-000000000001',
      rawAddress:        'Ul. Mustafe Pintola 2, 71000 Sarajevo',
      scheduledDate:     new Date('2026-04-28T08:00:00.000Z'),
      status:            JobStatus.COMPLETED,
      priority:          JobPriority.ROUTINE,
      estimatedDuration: 60,
      actualStartTime:   new Date('2026-04-28T08:05:00.000Z'),
      actualEndTime:     new Date('2026-04-28T09:10:00.000Z'),
      notes:             'Zamjena filtera — završeno bez problema.',
    },
  ],

  serviceLogs: [
    {
      id:    '0197f8a0-0005-7000-8000-000000000001',
      jobId: '0197f8a0-0004-7000-8000-000000000004',
    },
  ],

  syncLogs: [
    {
      id:             '0197f8a0-0006-7000-8000-000000000001',
      action:         SyncAction.UPLOAD,
      affectedEntity: 'Job',
      affectedId:     '0197f8a0-0004-7000-8000-000000000004',
      result:         SyncResult.SUCCESS,
      jobId:          '0197f8a0-0004-7000-8000-000000000004',
    },
    {
      id:              '0197f8a0-0006-7000-8000-000000000002',
      action:          SyncAction.UPLOAD,
      affectedEntity:  'Job',
      affectedId:      '0197f8a0-0004-7000-8000-000000000002',
      result:          SyncResult.FAIL,
      conflictDetails: { reason: 'Network timeout during field sync', retryable: true },
      jobId:           '0197f8a0-0004-7000-8000-000000000002',
    },
  ],
} as const;

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Users + Profiles
  for (const { profile, ...userData } of SEED.users) {
    await prisma.user.upsert({
      where:  { id: userData.id },
      update: {},
      create: {
        ...userData,
        profile: { create: profile },
      },
    });
  }
  console.log(`✔ Users (${SEED.users.length})`);

  // 2. Clients + Sites
  for (const { sites, ...clientData } of SEED.clients) {
    await prisma.client.upsert({
      where:  { id: clientData.id },
      update: {},
      create: clientData,
    });

    for (const siteData of sites) {
      await prisma.site.upsert({
        where:  { id: siteData.id },
        update: {},
        create: { ...siteData, clientId: clientData.id },
      });
    }
  }
  console.log(`✔ Clients (${SEED.clients.length}) + Sites`);

  // 3. Jobs
  for (const jobData of SEED.jobs) {
    await prisma.job.upsert({
      where:  { id: jobData.id },
      update: {},
      create: jobData,
    });
  }
  console.log(`✔ Jobs (${SEED.jobs.length})`);

  // 4. ServiceLogs
  for (const logData of SEED.serviceLogs) {
    await prisma.serviceLog.upsert({
      where:  { id: logData.id },
      update: {},
      create: logData,
    });
  }
  console.log(`✔ ServiceLogs (${SEED.serviceLogs.length})`);

  // 5. SyncLogs
  for (const syncData of SEED.syncLogs) {
    await prisma.syncLog.upsert({
      where:  { id: syncData.id },
      update: {},
      create: syncData,
    });
  }
  console.log(`✔ SyncLogs (${SEED.syncLogs.length})`);

  console.log('✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });