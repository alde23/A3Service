import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

const makePrisma = () => ({
  laborEntry: {
    findMany: vi.fn(),
  },
  consumedPart: {
    findMany: vi.fn(),
  },
  expense: {
    findMany: vi.fn(),
  },
});

type PrismaMock = ReturnType<typeof makePrisma>;

describe('AnalyticsService', () => {
  let prisma: PrismaMock;
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  it('returns zeroed summary when no records exist', async () => {
    prisma.laborEntry.findMany.mockResolvedValue([]);
    prisma.consumedPart.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);

    const result = await service.getSummary({
      period: 'custom',
      start: '2026-05-01T00:00:00.000Z',
      end: '2026-05-02T00:00:00.000Z',
    });

    expect(result.totals).toEqual({
      earnings: '0.00',
      expenses: '0.00',
      profit: '0.00',
    });
  });

  it('aggregates earnings from labor and parts', async () => {
    prisma.laborEntry.findMany.mockResolvedValue([
      {
        hours: 2,
        hourlyRate: new Prisma.Decimal(100),
        serviceLog: { createdAt: new Date('2026-05-10T10:00:00.000Z') },
      },
    ]);

    prisma.consumedPart.findMany.mockResolvedValue([
      {
        quantity: 3,
        unitPrice: new Prisma.Decimal(25),
        serviceLog: { createdAt: new Date('2026-05-10T12:00:00.000Z') },
      },
    ]);

    prisma.expense.findMany.mockResolvedValue([]);

    const result = await service.getEarnings({
      period: 'custom',
      start: '2026-05-10T00:00:00.000Z',
      end: '2026-05-10T23:59:59.000Z',
    });

    expect(result.total).toBe('275.00');
    expect(result.items[0].value).toBe('275.00');
  });

  it('aggregates expenses by bucket', async () => {
    prisma.laborEntry.findMany.mockResolvedValue([]);
    prisma.consumedPart.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([
      {
        amount: new Prisma.Decimal(50),
        incurredAt: new Date('2026-05-11T08:00:00.000Z'),
      },
    ]);

    const result = await service.getExpenses({
      period: 'custom',
      start: '2026-05-11T00:00:00.000Z',
      end: '2026-05-11T23:59:59.000Z',
    });

    expect(result.total).toBe('50.00');
    expect(result.items[0].value).toBe('50.00');
  });
});
