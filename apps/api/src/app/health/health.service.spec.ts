import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

const makePrisma = () => ({
  $queryRaw: vi.fn(),
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('HealthService', () => {
  let prisma: PrismaMock;
  let service: HealthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new HealthService(prisma as unknown as PrismaService);
  });

  it('returns ok when database responds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ count: 0 }]);

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.database.ok).toBe(true);
    expect(result.database.pendingMigrations).toBe(0);
  });

  it('returns degraded when database fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('boom'));

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.database.ok).toBe(false);
  });
});
