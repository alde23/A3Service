import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserRole } from '../../generated/prisma/client';
import { JobsService } from './jobs.service';

const makePrisma = () => ({
  job: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
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

  describe('findAll', () => {
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

  describe('create', () => {
    it('throws if scheduledDate is invalid', async () => {
      await expect(service.create({ scheduledDate: 'invalid' } as any)).rejects.toThrow('scheduledDate must be a valid date string');
    });

    it('throws if estimatedDuration is invalid', async () => {
      await expect(service.create({ scheduledDate: '2025-01-01', estimatedDuration: -5 } as any)).rejects.toThrow('estimatedDuration must be a positive integer');
    });

    it('throws if technicianId is missing', async () => {
      await expect(service.create({ scheduledDate: '2025-01-01', estimatedDuration: 120 } as any)).rejects.toThrow('technicianId is required');
    });

    it('throws if siteId is missing', async () => {
      await expect(service.create({ scheduledDate: '2025-01-01', estimatedDuration: 120, technicianId: 't1' } as any)).rejects.toThrow('siteId is required');
    });

    it('throws if status is invalid', async () => {
      await expect(service.create({ scheduledDate: '2025-01-01', estimatedDuration: 120, technicianId: 't1', siteId: 's1', status: 'INVALID' } as any)).rejects.toThrow('status is invalid');
    });

    it('throws if there is a scheduling conflict', async () => {
      scheduling.hasConflict.mockResolvedValue(true);
      await expect(service.create({ scheduledDate: '2025-01-01', estimatedDuration: 120, technicianId: 't1', siteId: 's1' } as any)).rejects.toThrow('Job conflicts with existing schedule');
    });

    it('creates job successfully', async () => {
      scheduling.hasConflict.mockResolvedValue(false);
      prisma.job.create.mockResolvedValue({ id: 'j1' } as any);
      const res = await service.create({ scheduledDate: '2025-01-01', estimatedDuration: 120, technicianId: 't1', siteId: 's1' } as any);
      expect(res.id).toBe('j1');
      expect(prisma.job.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns job if found for manager', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j1' });
      const res = await service.findOne('j1', { role: UserRole.MANAGER, sub: 'm1' } as any);
      expect(res.id).toBe('j1');
    });

    it('throws if not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.findOne('j1', { role: UserRole.MANAGER, sub: 'm1' } as any)).rejects.toThrow('Job not found');
    });
  });

  describe('update', () => {
    it('throws if scheduledDate is invalid', async () => {
      await expect(service.update('j1', { scheduledDate: 'invalid' } as any, {} as any)).rejects.toThrow('scheduledDate must be a valid date string');
    });

    it('throws if estimatedDuration is invalid', async () => {
      await expect(service.update('j1', { estimatedDuration: -5 } as any, {} as any)).rejects.toThrow('estimatedDuration must be a positive integer');
    });

    it('throws if status is invalid', async () => {
      await expect(service.update('j1', { status: 'INVALID' } as any, {} as any)).rejects.toThrow('status is invalid');
    });

    it('updates job for manager', async () => {
      prisma.job.update.mockResolvedValue({ id: 'j1' });
      await service.update('j1', { estimatedDuration: 120 } as any, { role: UserRole.MANAGER } as any);
      expect(prisma.job.update).toHaveBeenCalled();
    });

    it('throws NotFound if update fails for manager', async () => {
      prisma.job.update.mockRejectedValue(new Error());
      await expect(service.update('j1', { estimatedDuration: 120 } as any, { role: UserRole.MANAGER } as any)).rejects.toThrow('Job not found');
    });

    it('throws if technician tries to update job they cannot see', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.update('j1', { estimatedDuration: 120 } as any, { role: UserRole.TECHNICIAN, sub: 't1' } as any)).rejects.toThrow('Job not found');
    });

    it('updates job for technician if they can see it', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j1' });
      prisma.job.update.mockResolvedValue({ id: 'j1' });
      await service.update('j1', { estimatedDuration: 120 } as any, { role: UserRole.TECHNICIAN, sub: 't1' } as any);
      expect(prisma.job.update).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('throws if status is missing or invalid', async () => {
      await expect(service.updateStatus('j1', {} as any, {} as any)).rejects.toThrow('status is invalid');
    });

    it('throws if job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus('j1', { status: 'IN_PROGRESS' } as any, { role: UserRole.MANAGER } as any)).rejects.toThrow('Job not found');
    });

    it('updates status', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j1' });
      prisma.job.update.mockResolvedValue({ id: 'j1' });
      await service.updateStatus('j1', { status: 'IN_PROGRESS' } as any, { role: UserRole.MANAGER } as any);
      expect(prisma.job.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws if job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.remove('j1')).rejects.toThrow('Job not found');
    });

    it('soft deletes job', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j1' });
      prisma.job.update.mockResolvedValue({ id: 'j1' });
      await service.remove('j1');
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDeleted: true }),
        })
      );
    });
  });
});
