import { PrismaClient, UserRole, JobStatus, JobPriority } from '@prisma/client';
import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Ensure DATABASE_URL is available when running from the repo root.
const envPath = join(process.cwd(), 'apps', 'api', '.env');
if (existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

const prisma = new PrismaClient();

const SEED = {
  users: {
    technician: {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'seed_tech',
      email: 'tech@a3service.local',
      passwordHash: 'seed-tech-not-a-real-hash',
      role: UserRole.TECHNICIAN,
    },
    manager: {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'seed_manager',
      email: 'manager@a3service.local',
      passwordHash: 'seed-manager-not-a-real-hash',
      role: UserRole.MANAGER,
    },
  },
  client: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Seed Client',
    email: 'contact@seedclient.local',
    phone: '555-0100',
  },
  site: {
    id: '44444444-4444-4444-4444-444444444444',
    rawAddress: '123 Seed St, Test City',
    latitude: 40.7128,
    longitude: -74.006,
    accessInstructions: 'Entry through front door',
  },
  jobs: {
    job1: {
      id: '55555555-5555-5555-5555-555555555555',
      scheduledDate: new Date('2026-04-06T15:30:00.000Z'),
      estimatedDuration: 60,
      status: JobStatus.PENDING,
      priority: JobPriority.ROUTINE,
      notes: 'Seeded job for testing',
    },
    job2: {
      id: '66666666-6666-6666-6666-666666666666',
      scheduledDate: new Date('2026-04-07T14:00:00.000Z'),
      estimatedDuration: 90,
      status: JobStatus.PENDING,
      priority: JobPriority.MAINTENANCE,
      notes: 'Second seeded job for testing',
    },
  },
} as const;

async function main() {
  const technician = await prisma.user.upsert({
    where: { email: SEED.users.technician.email },
    update: {
      role: SEED.users.technician.role,
      passwordHash: SEED.users.technician.passwordHash,
    },
    create: {
      id: SEED.users.technician.id,
      username: SEED.users.technician.username,
      email: SEED.users.technician.email,
      passwordHash: SEED.users.technician.passwordHash,
      role: SEED.users.technician.role,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: SEED.users.manager.email },
    update: {
      role: SEED.users.manager.role,
      passwordHash: SEED.users.manager.passwordHash,
    },
    create: {
      id: SEED.users.manager.id,
      username: SEED.users.manager.username,
      email: SEED.users.manager.email,
      passwordHash: SEED.users.manager.passwordHash,
      role: SEED.users.manager.role,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: SEED.client.id },
    update: {
      name: SEED.client.name,
      email: SEED.client.email,
      phone: SEED.client.phone,
    },
    create: {
      id: SEED.client.id,
      name: SEED.client.name,
      email: SEED.client.email,
      phone: SEED.client.phone,
    },
  });

  const site = await prisma.site.upsert({
    where: { id: SEED.site.id },
    update: {
      rawAddress: SEED.site.rawAddress,
      latitude: SEED.site.latitude,
      longitude: SEED.site.longitude,
      accessInstructions: SEED.site.accessInstructions,
    },
    create: {
      id: SEED.site.id,
      clientId: client.id,
      rawAddress: SEED.site.rawAddress,
      latitude: SEED.site.latitude,
      longitude: SEED.site.longitude,
      accessInstructions: SEED.site.accessInstructions,
    },
  });

  await prisma.job.upsert({
    where: { id: SEED.jobs.job1.id },
    update: {
      scheduledDate: SEED.jobs.job1.scheduledDate,
      estimatedDuration: SEED.jobs.job1.estimatedDuration,
      status: SEED.jobs.job1.status,
      notes: SEED.jobs.job1.notes,
      technicianId: technician.id,
      managerId: manager.id,
    },
    create: {
      id: SEED.jobs.job1.id,
      siteId: site.id,
      scheduledDate: SEED.jobs.job1.scheduledDate,
      estimatedDuration: SEED.jobs.job1.estimatedDuration,
      status: SEED.jobs.job1.status,
      notes: SEED.jobs.job1.notes,
      technicianId: technician.id,
      managerId: manager.id,
    },
  });

  await prisma.job.upsert({
    where: { id: SEED.jobs.job2.id },
    update: {
      scheduledDate: SEED.jobs.job2.scheduledDate,
      estimatedDuration: SEED.jobs.job2.estimatedDuration,
      status: SEED.jobs.job2.status,
      notes: SEED.jobs.job2.notes,
      technicianId: technician.id,
      managerId: manager.id,
    },
    create: {
      id: SEED.jobs.job2.id,
      siteId: site.id,
      scheduledDate: SEED.jobs.job2.scheduledDate,
      estimatedDuration: SEED.jobs.job2.estimatedDuration,
      status: SEED.jobs.job2.status,
      notes: SEED.jobs.job2.notes,
      technicianId: technician.id,
      managerId: manager.id,
    },
  });

  console.log('Seed complete');
  console.log({
    technicianId: technician.id,
    managerId: manager.id,
    clientId: client.id,
    siteId: site.id,
    jobIds: [SEED.jobs.job1.id, SEED.jobs.job2.id],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
