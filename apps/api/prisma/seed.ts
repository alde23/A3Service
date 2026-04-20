import { PrismaClient, Role, JobStatus } from '@prisma/client';
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
      email: 'tech@a3service.local',
      passwordHash: 'seed-tech-not-a-real-hash',
      fullName: 'Seed Technician',
      role: Role.TECHNICIAN,
    },
    manager: {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'manager@a3service.local',
      passwordHash: 'seed-manager-not-a-real-hash',
      fullName: 'Seed Manager',
      role: Role.MANAGER,
    },
  },
  client: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Seed Client',
    phone: '555-0100',
    address: '123 Seed St, Test City',
    latitude: 40.7128,
    longitude: -74.006,
  },
  jobs: {
    job1: {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Seed Job 1 - HVAC Inspection',
      scheduledAt: new Date('2026-04-06T15:30:00.000Z'),
      durationMinutes: 60,
      status: JobStatus.SCHEDULED,
      notes: 'Seeded job for testing',
      latitude: 40.7128,
      longitude: -74.006,
    },
    job2: {
      id: '55555555-5555-5555-5555-555555555555',
      title: 'Seed Job 2 - Replace Thermostat',
      scheduledAt: new Date('2026-04-07T14:00:00.000Z'),
      durationMinutes: 90,
      status: JobStatus.PENDING,
      notes: 'Second seeded job for testing',
      latitude: 40.7139,
      longitude: -74.005,
    },
  },
} as const;

async function main() {
  const technician = await prisma.user.upsert({
    where: { email: SEED.users.technician.email },
    update: {
      fullName: SEED.users.technician.fullName,
      role: SEED.users.technician.role,
      passwordHash: SEED.users.technician.passwordHash,
    },
    create: {
      id: SEED.users.technician.id,
      email: SEED.users.technician.email,
      passwordHash: SEED.users.technician.passwordHash,
      fullName: SEED.users.technician.fullName,
      role: SEED.users.technician.role,
    },
  });

  await prisma.user.upsert({
    where: { email: SEED.users.manager.email },
    update: {
      fullName: SEED.users.manager.fullName,
      role: SEED.users.manager.role,
      passwordHash: SEED.users.manager.passwordHash,
    },
    create: {
      id: SEED.users.manager.id,
      email: SEED.users.manager.email,
      passwordHash: SEED.users.manager.passwordHash,
      fullName: SEED.users.manager.fullName,
      role: SEED.users.manager.role,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: SEED.client.id },
    update: {
      name: SEED.client.name,
      phone: SEED.client.phone,
      address: SEED.client.address,
      latitude: SEED.client.latitude,
      longitude: SEED.client.longitude,
    },
    create: {
      id: SEED.client.id,
      name: SEED.client.name,
      phone: SEED.client.phone,
      address: SEED.client.address,
      latitude: SEED.client.latitude,
      longitude: SEED.client.longitude,
    },
  });

  await prisma.job.upsert({
    where: { id: SEED.jobs.job1.id },
    update: {
      title: SEED.jobs.job1.title,
      scheduledAt: SEED.jobs.job1.scheduledAt,
      durationMinutes: SEED.jobs.job1.durationMinutes,
      status: SEED.jobs.job1.status,
      notes: SEED.jobs.job1.notes,
      latitude: SEED.jobs.job1.latitude,
      longitude: SEED.jobs.job1.longitude,
      technicianId: technician.id,
      clientId: client.id,
    },
    create: {
      id: SEED.jobs.job1.id,
      title: SEED.jobs.job1.title,
      scheduledAt: SEED.jobs.job1.scheduledAt,
      durationMinutes: SEED.jobs.job1.durationMinutes,
      status: SEED.jobs.job1.status,
      notes: SEED.jobs.job1.notes,
      latitude: SEED.jobs.job1.latitude,
      longitude: SEED.jobs.job1.longitude,
      technicianId: technician.id,
      clientId: client.id,
    },
  });

  await prisma.job.upsert({
    where: { id: SEED.jobs.job2.id },
    update: {
      title: SEED.jobs.job2.title,
      scheduledAt: SEED.jobs.job2.scheduledAt,
      durationMinutes: SEED.jobs.job2.durationMinutes,
      status: SEED.jobs.job2.status,
      notes: SEED.jobs.job2.notes,
      latitude: SEED.jobs.job2.latitude,
      longitude: SEED.jobs.job2.longitude,
      technicianId: technician.id,
      clientId: client.id,
    },
    create: {
      id: SEED.jobs.job2.id,
      title: SEED.jobs.job2.title,
      scheduledAt: SEED.jobs.job2.scheduledAt,
      durationMinutes: SEED.jobs.job2.durationMinutes,
      status: SEED.jobs.job2.status,
      notes: SEED.jobs.job2.notes,
      latitude: SEED.jobs.job2.latitude,
      longitude: SEED.jobs.job2.longitude,
      technicianId: technician.id,
      clientId: client.id,
    },
  });

  console.log('Seed complete');
  console.log({
    technicianId: technician.id,
    clientId: client.id,
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
