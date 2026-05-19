import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserRole } from '../../generated/prisma/client';
import { JobsService } from './jobs.service';

const makePrisma = () => ({
  job: {
    findMany: vi.fn(),
  },
});

const makeScheduling = () => ({
  hasConflict: vi.fn(),
});

describe('JobsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let scheduling: ReturnType<typeof makeScheduling>;
  let service: JobsService;

  beforeEach(() => {
    prisma = makePrisma();
    scheduling = makeScheduling();
    service = new JobsService(prisma as any, scheduling as any);
  });

  it('findAll uses manager scope for managers', async () => {
    prisma.job.findMany.mockResolvedValue([]);

    await service.findAll({ role: UserRole.MANAGER, sub: 'manager-1' } as any);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false },
      }),
    );
  });

  it('findAll scopes to technician for technicians', async () => {
    prisma.job.findMany.mockResolvedValue([]);

    await service.findAll({ role: UserRole.TECHNICIAN, sub: 'tech-1' } as any);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technicianId: 'tech-1', isDeleted: false },
      }),
    );
  });
});
