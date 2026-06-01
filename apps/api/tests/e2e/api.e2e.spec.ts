import 'reflect-metadata';
import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '../../src/generated/prisma/client';

type TestUser = {
  id: string;
  email: string;
  password: string;
};

type TestSite = {
  id: string;
};

const DEFAULT_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/a3service';

function ensureTestEnv() {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? DEFAULT_DB_URL;
  process.env.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-supabase-service-role-key';
  process.env.SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? 'test-supabase-anon-key';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'test-jwt-secret-32-characters-minimum!';
}

async function resetDatabase(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(`
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
`);
}

async function seedUser(prisma: PrismaService, role: UserRole, email: string): Promise<TestUser> {
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: email.split('@')[0],
      email,
      passwordHash,
      role,
    },
  });

  return { id: user.id, email: user.email, password };
}

async function seedSite(prisma: PrismaService): Promise<TestSite> {
  const client = await prisma.client.create({
    data: {
      name: 'Test Client',
      email: 'client@example.com',
      phone: '123',
    },
  });

  const site = await prisma.site.create({
    data: {
      clientId: client.id,
      rawAddress: 'Test Address',
      latitude: 0,
      longitude: 0,
    },
  });

  return { id: site.id };
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  return res;
}

describe('API E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let manager: TestUser;
  let technician: TestUser;
  let otherTech: TestUser;
  let site: TestSite;

  beforeAll(async () => {
    ensureTestEnv();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  beforeEach(async () => {
    await resetDatabase(prisma);
    manager = await seedUser(prisma, UserRole.MANAGER, 'manager@a3.test');
    technician = await seedUser(prisma, UserRole.TECHNICIAN, 'tech@a3.test');
    otherTech = await seedUser(prisma, UserRole.TECHNICIAN, 'tech2@a3.test');
    site = await seedSite(prisma);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('returns health status', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });

  it('logs in with valid credentials', async () => {
    const res = await login(app, manager.email, manager.password);
    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
  });

  it('rejects login with invalid credentials', async () => {
    const res = await login(app, manager.email, 'wrong');
    expect(res.status).toBe(401);
  });

  it('rejects refresh with invalid token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: 'invalid-token' });

    expect(res.status).toBe(401);
  });

  it('creates a job as manager', async () => {
    const auth = await login(app, manager.email, manager.password);
    const token = auth.body.access_token as string;

    const res = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        siteId: site.id,
        technicianId: technician.id,
        scheduledDate: new Date().toISOString(),
        estimatedDuration: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('returns only technician jobs for that user', async () => {
    const managerAuth = await login(app, manager.email, manager.password);
    const managerToken = managerAuth.body.access_token as string;

    await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        siteId: site.id,
        technicianId: technician.id,
        scheduledDate: new Date().toISOString(),
      });

    await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        siteId: site.id,
        technicianId: otherTech.id,
        scheduledDate: new Date().toISOString(),
      });

    const techAuth = await login(app, technician.email, technician.password);
    const techToken = techAuth.body.access_token as string;

    const res = await request(app.getHttpServer())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${techToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].technicianId).toBe(technician.id);
  });

  it('creates a service log with totals', async () => {
    const managerAuth = await login(app, manager.email, manager.password);
    const managerToken = managerAuth.body.access_token as string;

    const jobRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        siteId: site.id,
        technicianId: technician.id,
        scheduledDate: new Date().toISOString(),
      });

    const part = await prisma.part.create({
      data: {
        sku: 'PART-1',
        name: 'Valve',
        aliases: [],
      },
    });

    const techAuth = await login(app, technician.email, technician.password);
    const techToken = techAuth.body.access_token as string;

    const res = await request(app.getHttpServer())
      .post('/api/service-logs')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        jobId: jobRes.body.id,
        laborEntries: [{ hours: 2, hourlyRate: 100 }],
        consumedParts: [{ partId: part.id, quantity: 2, unitPrice: 25 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.totals).toEqual({
      laborTotal: '200.00',
      partsTotal: '50.00',
      totalCost: '250.00',
    });
  });

  it('treats service log sync as idempotent', async () => {
    const managerAuth = await login(app, manager.email, manager.password);
    const managerToken = managerAuth.body.access_token as string;

    const jobRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        siteId: site.id,
        technicianId: technician.id,
        scheduledDate: new Date().toISOString(),
      });

    const part = await prisma.part.create({
      data: {
        sku: 'PART-2',
        name: 'Pump',
        aliases: [],
      },
    });

    const techAuth = await login(app, technician.email, technician.password);
    const techToken = techAuth.body.access_token as string;

    const createRes = await request(app.getHttpServer())
      .post('/api/service-logs')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        jobId: jobRes.body.id,
        laborEntries: [{ hours: 1, hourlyRate: 80 }],
        consumedParts: [{ partId: part.id, quantity: 1, unitPrice: 20 }],
      });

    const logId = createRes.body.id as string;
    const payload = {
      idempotencyKey: 'sync-key-1',
      jobId: jobRes.body.id,
      laborEntries: [{ hours: 1, hourlyRate: 80 }],
      consumedParts: [{ partId: part.id, quantity: 1, unitPrice: 20 }],
    };

    const first = await request(app.getHttpServer())
      .post(`/api/service-logs/${logId}/sync`)
      .set('Authorization', `Bearer ${techToken}`)
      .send(payload);

    const second = await request(app.getHttpServer())
      .post(`/api/service-logs/${logId}/sync`)
      .set('Authorization', `Bearer ${techToken}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.duplicate).toBe(false);
    expect(second.body.duplicate).toBe(true);
  });

  it('reconciles sync logs with idempotency', async () => {
    const auth = await login(app, manager.email, manager.password);
    const token = auth.body.access_token as string;

    const payload = {
      items: [
        {
          idempotencyKey: 'reconcile-key-1',
          action: 'UPLOAD',
          affectedEntity: 'Job',
          affectedId: 'job-1',
        },
      ],
    };

    const first = await request(app.getHttpServer())
      .post('/api/sync/reconcile')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const second = await request(app.getHttpServer())
      .post('/api/sync/reconcile')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.duplicates).toBe(0);
    expect(second.body.duplicates).toBe(1);
  });

  it('returns analytics summary for manager', async () => {
    const auth = await login(app, manager.email, manager.password);
    const token = auth.body.access_token as string;

    const res = await request(app.getHttpServer())
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totals).toBeDefined();
  });
});
