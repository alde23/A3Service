import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UserRole, WarrantyStatus } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { WarrantyService } from './warranty.service';
import type { CommissioningService } from '../commissioning/commissioning.service';

const makePrisma = () => ({
  warranty: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  job: {
    findFirst: vi.fn(),
  },
  boilerModel: {
    findFirst: vi.fn(),
  },
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('WarrantyService', () => {
  let prisma: PrismaMock;
  let commissioningService: { validate: ReturnType<typeof vi.fn> };
  let service: WarrantyService;

  beforeEach(() => {
    prisma = makePrisma();
    commissioningService = { validate: vi.fn() };
    service = new WarrantyService(
      prisma as unknown as PrismaService,
      commissioningService as unknown as CommissioningService,
    );
  });

  describe('list', () => {
    it('returns paginated items for technician', async () => {
      prisma.warranty.count.mockResolvedValue(1);
      prisma.warranty.findMany.mockResolvedValue([
        {
          id: 'w-1',
          boilerModelId: 'model-1',
          jobId: 'job-1',
          startDate: new Date(),
          durationMonths: 12,
          expiresAt: new Date(),
          status: WarrantyStatus.ACTIVE,
          notes: null,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]);

      const result = await service.list({ sub: 'tech-1', role: UserRole.TECHNICIAN } as any, WarrantyStatus.ACTIVE, 1, 10);
      expect(result.items.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('throws if not found', async () => {
      prisma.warranty.findFirst.mockResolvedValue(null);
      await expect(service.getById({ sub: 'm1', role: UserRole.MANAGER } as any, 'w-1')).rejects.toThrow('Warranty not found');
    });

    it('returns warranty if found', async () => {
      prisma.warranty.findFirst.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date(),
        durationMonths: 12,
        expiresAt: new Date(),
        status: WarrantyStatus.ACTIVE,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.getById({ sub: 'm1', role: UserRole.MANAGER } as any, 'w-1');
      expect(result.id).toBe('w-1');
    });
  });

  describe('create', () => {
    it('throws if jobId is missing', async () => {
      await expect(service.create({} as any, {} as any)).rejects.toThrow('jobId is required');
    });

    it('throws if boilerModelId is missing', async () => {
      await expect(service.create({} as any, { jobId: 'j' } as any)).rejects.toThrow('boilerModelId is required');
    });

    it('throws if readings missing', async () => {
      await expect(service.create({} as any, { jobId: 'j', boilerModelId: 'm' } as any)).rejects.toThrow('readings are required');
    });

    it('throws if startDate is invalid', async () => {
      await expect(service.create({} as any, { jobId: 'j', boilerModelId: 'm', readings: [{}], startDate: 'invalid' } as any)).rejects.toThrow('startDate must be a valid ISO date string');
    });

    it('throws if durationMonths is invalid', async () => {
      await expect(service.create({} as any, { jobId: 'j', boilerModelId: 'm', readings: [{}], durationMonths: -5 } as any)).rejects.toThrow('durationMonths must be a positive integer');
    });

    it('throws if job not found', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(service.create({ sub: 'm', role: UserRole.MANAGER } as any, { jobId: 'j', boilerModelId: 'm', readings: [{}] } as any)).rejects.toThrow('Job not found');
    });

    it('throws if boiler model not found', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j' });
      prisma.boilerModel.findFirst.mockResolvedValue(null);
      await expect(service.create({ sub: 'm', role: UserRole.MANAGER } as any, { jobId: 'j', boilerModelId: 'm', readings: [{}] } as any)).rejects.toThrow('Boiler model not found');
    });

    it('rejects warranty creation when commissioning fails', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
      commissioningService.validate.mockResolvedValue({ valid: false });

      await expect(
        service.create(
          { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
          {
            jobId: 'job-1',
            boilerModelId: 'model-1',
            readings: [{ code: 'pressure', value: 10 }],
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates warranty if validation passes', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
      commissioningService.validate.mockResolvedValue({ valid: true });
      prisma.warranty.create.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date(),
        durationMonths: 12,
        expiresAt: new Date(),
        status: WarrantyStatus.ACTIVE,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
        {
          jobId: 'job-1',
          boilerModelId: 'model-1',
          readings: [{ code: 'pressure', value: 10 }],
        },
      );
      expect(result.id).toBe('w-1');
    });
  });

  describe('updateStatus', () => {
    it('throws if status is missing', async () => {
      await expect(service.updateStatus({} as any, 'w-1', {} as any)).rejects.toThrow('status is required');
    });

    it('throws if warranty not found', async () => {
      prisma.warranty.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus({} as any, 'w-1', { status: WarrantyStatus.ACTIVE } as any)).rejects.toThrow('Warranty not found');
    });

    it('prevents activation when warranty is already expired', async () => {
      const expired = new Date('2024-01-01T00:00:00.000Z');
      prisma.warranty.findFirst.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date('2023-01-01T00:00:00.000Z'),
        durationMonths: 12,
        expiresAt: expired,
        status: WarrantyStatus.EXPIRED,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: expired,
        updatedAt: expired,
      });

      await expect(
        service.updateStatus(
          { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
          'w-1',
          { status: WarrantyStatus.ACTIVE },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('prevents expiry before expiry date', async () => {
      const future = new Date(Date.now() + 100000000);
      prisma.warranty.findFirst.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date(),
        durationMonths: 12,
        expiresAt: future,
        status: WarrantyStatus.ACTIVE,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.updateStatus(
          { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
          'w-1',
          { status: WarrantyStatus.EXPIRED },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates status successfully', async () => {
      const future = new Date(Date.now() + 100000000);
      prisma.warranty.findFirst.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date(),
        durationMonths: 12,
        expiresAt: future,
        status: WarrantyStatus.ACTIVE,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.warranty.update.mockResolvedValue({
        id: 'w-1',
        boilerModelId: 'model-1',
        jobId: 'job-1',
        startDate: new Date(),
        durationMonths: 12,
        expiresAt: future,
        status: WarrantyStatus.VOID,
        notes: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateStatus(
        { sub: 'tech-1', email: 'tech-1@a3.local', role: UserRole.TECHNICIAN },
        'w-1',
        { status: WarrantyStatus.VOID },
      );
      expect(result.status).toBe(WarrantyStatus.VOID);
    });
  });
});
