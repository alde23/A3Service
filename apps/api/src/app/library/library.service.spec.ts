import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IngestionStatus } from '../../generated/prisma/client';
import { LibraryService } from './library.service';

const makePrisma = () => ({
  boilerModel: {
    count: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  faultCode: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  part: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  manual: {
    upsert: vi.fn(),
  },
  modelFaultCode: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  modelPart: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  libraryIngestionRun: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('LibraryService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: LibraryService;

  beforeEach(() => {
    prisma = makePrisma();
    prisma.$transaction = vi.fn(async (cb: any) => cb(prisma));
    service = new LibraryService(prisma as any);
  });

  it('search returns paged results with stable ordering', async () => {
    prisma.boilerModel.count.mockResolvedValue(0);
    prisma.boilerModel.findMany.mockResolvedValue([]);

    const result = await service.search({ q: 'boiler', page: 1, pageSize: 25 });

    expect(result.meta).toEqual({ total: 0, page: 1, pageSize: 25 });
    expect(prisma.boilerModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ modelName: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('validateIngest reports missing required fields', async () => {
    const result = await service.validateIngest({
      models: [{ id: '', modelName: '' }],
      faults: [{ id: '', code: '', title: '' }],
      parts: [{ id: '', sku: '', name: '' }],
      manuals: [{ id: '', boilerModelId: '' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('ingest upserts data and completes run', async () => {
    prisma.libraryIngestionRun.create.mockResolvedValue({
      id: 'run-1',
      status: IngestionStatus.PENDING,
    });
    prisma.libraryIngestionRun.update.mockResolvedValue({
      id: 'run-1',
      status: IngestionStatus.COMPLETED,
    });

    const payload = {
      sourceVersion: 'v1',
      models: [
        {
          id: 'model-1',
          modelName: 'X1000',
        },
      ],
      faults: [
        {
          id: 'fault-1',
          code: 'F-1',
          title: 'Fault',
        },
      ],
      parts: [
        {
          id: 'part-1',
          sku: 'P-1',
          name: 'Pump',
        },
      ],
      manuals: [
        {
          id: 'manual-1',
          boilerModelId: 'model-1',
        },
      ],
      modelFaults: [{ modelId: 'model-1', faultCodeId: 'fault-1' }],
      modelParts: [{ modelId: 'model-1', partId: 'part-1' }],
    };

    const result = await service.ingest(payload);

    expect(result.status).toBe('COMPLETED');
    expect(prisma.boilerModel.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.faultCode.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.part.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.manual.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.modelFaultCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(prisma.modelPart.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });
});
