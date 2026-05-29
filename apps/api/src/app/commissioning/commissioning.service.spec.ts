import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { CommissioningService } from './commissioning.service';

const makePrisma = () => ({
  boilerModel: {
    findFirst: vi.fn(),
  },
  referenceTable: {
    findMany: vi.fn(),
  },
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('CommissioningService', () => {
  let prisma: PrismaMock;
  let service: CommissioningService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CommissioningService(prisma as unknown as PrismaService);
  });

  it('flags missing required readings and out-of-range values', async () => {
    prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
    prisma.referenceTable.findMany.mockResolvedValue([
      {
        boilerModelId: 'model-1',
        required: true,
        minValue: new Prisma.Decimal(10),
        maxValue: new Prisma.Decimal(20),
        property: { code: 'pressure', label: 'Pressure', unit: 'bar' },
      },
    ]);

    const result = await service.validate({
      modelId: 'model-1',
      readings: [{ code: 'pressure', value: 25 }],
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0].status).toBe('OUT_OF_RANGE');
  });

  it('rejects invalid reading payloads', async () => {
    prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
    prisma.referenceTable.findMany.mockResolvedValue([]);

    await expect(
      service.validate({
        modelId: 'model-1',
        readings: [{ code: 'temp', value: Number.NaN }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
