import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SchedulingService } from './scheduling.service';

const makePrisma = () => ({
  job: {
    findMany: vi.fn(),
  },
});

describe('SchedulingService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SchedulingService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SchedulingService(prisma as any);
  });

  it('returns false when there are no conflicts', async () => {
    prisma.job.findMany.mockResolvedValue([]);

    const result = await service.hasConflict(
      'tech-1',
      new Date('2026-01-01T09:00:00Z'),
      60,
    );

    expect(result).toBe(false);
  });
});
