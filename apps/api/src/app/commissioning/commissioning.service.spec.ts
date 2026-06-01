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

  describe('getReference', () => {
    it('throws if model not found', async () => {
      prisma.boilerModel.findFirst.mockResolvedValue(null);
      await expect(service.getReference('model-1')).rejects.toThrow('Boiler model not found');
    });

    it('returns formatted references', async () => {
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
      const result = await service.getReference('model-1');
      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe('pressure');
      expect(result.items[0].min).toBe('10.00');
    });
  });

  describe('validate', () => {
    it('throws if modelId is missing', async () => {
      await expect(service.validate({ readings: [] } as any)).rejects.toThrow('modelId is required');
    });

    it('throws if readings missing or not an array', async () => {
      await expect(service.validate({ modelId: 'm1' } as any)).rejects.toThrow('readings must be an array');
    });

    it('throws if model not found', async () => {
      prisma.boilerModel.findFirst.mockResolvedValue(null);
      await expect(service.validate({ modelId: 'm1', readings: [] })).rejects.toThrow('Boiler model not found');
    });

    it('throws if reading code is missing', async () => {
      prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
      prisma.referenceTable.findMany.mockResolvedValue([]);
      await expect(service.validate({ modelId: 'm1', readings: [{ value: 10 } as any] })).rejects.toThrow('readings.code is required');
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
        {
          boilerModelId: 'model-1',
          required: true,
          minValue: new Prisma.Decimal(5),
          maxValue: null,
          property: { code: 'flow', label: 'Flow', unit: 'l/m' },
        }
      ]);

      const result = await service.validate({
        modelId: 'model-1',
        readings: [{ code: 'pressure', value: 25 }],
      });

      expect(result.valid).toBe(false);
      expect(result.issues.find((i) => i.code === 'pressure')?.status).toBe('OUT_OF_RANGE');
      expect(result.issues.find((i) => i.code === 'flow')?.status).toBe('MISSING');
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

    it('handles unknown readings', async () => {
      prisma.boilerModel.findFirst.mockResolvedValue({ id: 'model-1' });
      prisma.referenceTable.findMany.mockResolvedValue([]);

      const result = await service.validate({
        modelId: 'model-1',
        readings: [{ code: 'unknown', value: 10 }],
      });
      expect(result.issues[0].status).toBe('UNKNOWN');
    });

    it('validates correct readings successfully', async () => {
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
        readings: [{ code: 'pressure', value: 15 }],
      });
      expect(result.valid).toBe(true);
      expect(result.issues[0].status).toBe('OK');
    });
  });
});
