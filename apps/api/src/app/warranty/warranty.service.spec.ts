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
});
