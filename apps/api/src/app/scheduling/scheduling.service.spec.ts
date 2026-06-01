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

  describe('hasConflict', () => {
    it('throws if technicianId is missing', async () => {
      await expect(service.hasConflict('', new Date(), 60)).rejects.toThrow('technicianId is required');
    });

    it('throws if scheduledDate is invalid', async () => {
      await expect(service.hasConflict('t1', new Date('invalid'), 60)).rejects.toThrow('scheduledDate must be a valid Date');
    });

    it('throws if estimatedDuration is invalid', async () => {
      await expect(service.hasConflict('t1', new Date(), -10)).rejects.toThrow('estimatedDuration must be a positive integer');
    });

    it('returns false when there are no jobs', async () => {
      prisma.job.findMany.mockResolvedValue([]);
      const result = await service.hasConflict('tech-1', new Date('2026-01-01T09:00:00Z'), 60);
      expect(result).toBe(false);
    });

    it('returns false when jobs do not overlap', async () => {
      prisma.job.findMany.mockResolvedValue([
        { scheduledDate: new Date('2026-01-01T11:00:00Z'), estimatedDuration: 60 }
      ]);
      const result = await service.hasConflict('tech-1', new Date('2026-01-01T09:00:00Z'), 60);
      expect(result).toBe(false);
    });

    it('returns true when jobs overlap', async () => {
      prisma.job.findMany.mockResolvedValue([
        { scheduledDate: new Date('2026-01-01T09:30:00Z'), estimatedDuration: 60 }
      ]);
      const result = await service.hasConflict('tech-1', new Date('2026-01-01T09:00:00Z'), 60);
      expect(result).toBe(true);
    });

    it('skips jobs without estimatedDuration', async () => {
      prisma.job.findMany.mockResolvedValue([
        { scheduledDate: new Date('2026-01-01T09:30:00Z'), estimatedDuration: null }
      ]);
      const result = await service.hasConflict('tech-1', new Date('2026-01-01T09:00:00Z'), 60);
      expect(result).toBe(false);
    });
  });

  describe('suggestAvailableTimeSlots', () => {
    it('throws if technicianId is missing', async () => {
      await expect(service.suggestAvailableTimeSlots({} as any)).rejects.toThrow('technicianId is required');
    });

    it('throws if date is invalid', async () => {
      await expect(service.suggestAvailableTimeSlots({ technicianId: 't1', date: 'invalid', estimatedDuration: 60 } as any)).rejects.toThrow('date must be in YYYY-MM-DD format');
    });

    it('throws if estimatedDuration is invalid', async () => {
      await expect(service.suggestAvailableTimeSlots({ technicianId: 't1', date: '2026-01-01', estimatedDuration: -5 } as any)).rejects.toThrow('estimatedDuration must be a positive integer');
    });

    it('throws if travelBufferMinutes is invalid', async () => {
      await expect(service.suggestAvailableTimeSlots({ technicianId: 't1', date: '2026-01-01', estimatedDuration: 60, travelBufferMinutes: -10 })).rejects.toThrow('travelBufferMinutes must be a non-negative integer');
    });

    it('returns full work day slots if no jobs', async () => {
      prisma.job.findMany.mockResolvedValue([]);
      const slots = await service.suggestAvailableTimeSlots({ technicianId: 't1', date: '2026-01-01', estimatedDuration: 60 });
      expect(slots.length).toBe(1);
      expect(slots[0].start).toEqual(new Date('2026-01-01T08:00:00Z'));
      expect(slots[0].end).toEqual(new Date('2026-01-01T18:00:00Z'));
    });

    it('returns gaps around busy intervals', async () => {
      prisma.job.findMany.mockResolvedValue([
        { scheduledDate: new Date('2026-01-01T10:00:00Z'), estimatedDuration: 120 }
      ]);
      const slots = await service.suggestAvailableTimeSlots({ technicianId: 't1', date: '2026-01-01', estimatedDuration: 60, travelBufferMinutes: 30 });
      expect(slots.length).toBe(2);
      expect(slots[0].start).toEqual(new Date('2026-01-01T08:00:00Z'));
      expect(slots[0].end).toEqual(new Date('2026-01-01T10:00:00Z'));
      expect(slots[1].start).toEqual(new Date('2026-01-01T12:00:00Z'));
      expect(slots[1].end).toEqual(new Date('2026-01-01T18:00:00Z'));
    });

    it('merges overlapping busy intervals', async () => {
      prisma.job.findMany.mockResolvedValue([
        { scheduledDate: new Date('2026-01-01T10:00:00Z'), estimatedDuration: 60 },
        { scheduledDate: new Date('2026-01-01T10:30:00Z'), estimatedDuration: 60 }
      ]);
      const slots = await service.suggestAvailableTimeSlots({ technicianId: 't1', date: '2026-01-01', estimatedDuration: 60, travelBufferMinutes: 0 });
      expect(slots.length).toBe(2);
      expect(slots[0].start).toEqual(new Date('2026-01-01T08:00:00Z'));
      expect(slots[0].end).toEqual(new Date('2026-01-01T10:00:00Z'));
      expect(slots[1].start).toEqual(new Date('2026-01-01T11:30:00Z'));
      expect(slots[1].end).toEqual(new Date('2026-01-01T18:00:00Z'));
    });
  });
});
