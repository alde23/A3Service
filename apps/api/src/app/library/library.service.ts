import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, IngestionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  FaultCodeIngestDto,
  IngestRunResponse,
  IngestValidationError,
  IngestValidationResult,
  LibraryIngestDto,
  LibraryModelIngestDto,
  ManualIngestDto,
  ModelFaultLinkDto,
  ModelPartLinkDto,
  PartIngestDto,
} from './dto/library-ingest.dto';
import type { LibrarySearchQueryDto } from './dto/library-search.dto';
import type {
  LibraryFaultDto,
  LibraryFaultResponse,
  LibraryManualDto,
  LibraryModelDto,
  LibraryModelListResponse,
  LibraryPartDto,
  LibraryPartResponse,
  LibrarySearchResponse,
} from './dto/library-response.dto';

type ModelWithRelations = Prisma.BoilerModelGetPayload<{
  include: {
    modelParts: { include: { part: true } };
    modelFaultCodes: { include: { faultCode: true } };
    manuals: true;
  };
}>;

type ModelWithOptionalManuals = Omit<ModelWithRelations, 'manuals'> & {
  manuals?: ModelWithRelations['manuals'];
};

type PartRecord = Prisma.PartGetPayload<Prisma.PartDefaultArgs>;
type FaultRecord = Prisma.FaultCodeGetPayload<Prisma.FaultCodeDefaultArgs>;
type ManualRecord = Prisma.ManualGetPayload<Prisma.ManualDefaultArgs>;

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: LibrarySearchQueryDto): Promise<LibrarySearchResponse> {
    const { page, pageSize } = this.normalizePagination(query.page, query.pageSize);
    const where = this.buildSearchWhere(query);

    const total = await this.prisma.boilerModel.count({ where });
    const items = await this.prisma.boilerModel.findMany({
      where,
      include: {
        modelParts: { include: { part: true } },
        modelFaultCodes: { include: { faultCode: true } },
      },
      orderBy: [{ modelName: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((model) => this.mapModel(model)),
      meta: { total, page, pageSize },
    };
  }

  async listModels(page?: number, pageSize?: number): Promise<LibraryModelListResponse> {
    const pagination = this.normalizePagination(page, pageSize);

    const total = await this.prisma.boilerModel.count({ where: { isDeleted: false } });
    const items = await this.prisma.boilerModel.findMany({
      where: { isDeleted: false },
      include: {
        modelParts: { include: { part: true } },
        modelFaultCodes: { include: { faultCode: true } },
      },
      orderBy: [{ modelName: 'asc' }, { id: 'asc' }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return {
      items: items.map((model) => this.mapModel(model)),
      meta: pagination.withTotal(total),
    };
  }

  async getModel(id: string): Promise<LibraryModelDto> {
    const model = await this.prisma.boilerModel.findFirst({
      where: { id, isDeleted: false },
      include: {
        modelParts: { include: { part: true } },
        modelFaultCodes: { include: { faultCode: true } },
        manuals: true,
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    return this.mapModel(model, true);
  }

  async getFaultByCode(code: string): Promise<LibraryFaultResponse> {
    const fault = await this.prisma.faultCode.findFirst({ where: { code } });
    if (!fault) {
      throw new NotFoundException('Fault code not found');
    }

    const links = await this.prisma.modelFaultCode.findMany({
      where: { faultCodeId: fault.id },
      include: { model: true },
    });

    return {
      fault: this.mapFault(fault),
      models: links.map((link) => this.mapModel(link.model)),
    };
  }

  async getPart(id: string): Promise<LibraryPartResponse> {
    const part = await this.prisma.part.findFirst({ where: { id } });
    if (!part) {
      throw new NotFoundException('Part not found');
    }

    const links = await this.prisma.modelPart.findMany({
      where: { partId: part.id },
      include: { model: true },
    });

    return {
      part: this.mapPart(part),
      models: links.map((link) => this.mapModel(link.model)),
    };
  }

  async validateIngest(payload: LibraryIngestDto): Promise<IngestValidationResult> {
    const errors: IngestValidationError[] = [];

    const models = payload.models ?? [];
    const faults = payload.faults ?? [];
    const parts = payload.parts ?? [];
    const manuals = payload.manuals ?? [];
    const modelFaults = payload.modelFaults ?? [];
    const modelParts = payload.modelParts ?? [];

    this.validateModels(models, errors);
    this.validateFaults(faults, errors);
    this.validateParts(parts, errors);
    this.validateManuals(manuals, errors);
    this.validateLinks(modelFaults, 'modelFaults', errors);
    this.validateLinks(modelParts, 'modelParts', errors);

    return {
      valid: errors.length === 0,
      errors,
      counts: {
        models: models.length,
        faults: faults.length,
        parts: parts.length,
        manuals: manuals.length,
        modelFaults: modelFaults.length,
        modelParts: modelParts.length,
      },
    };
  }

  async ingest(payload: LibraryIngestDto): Promise<IngestRunResponse> {
    const validation = await this.validateIngest(payload);
    const run = await this.prisma.libraryIngestionRun.create({
      data: {
        status: validation.valid ? IngestionStatus.PENDING : IngestionStatus.FAILED,
        sourceVersion: payload.sourceVersion,
        acceptedCount: 0,
        rejectedCount: validation.errors.length,
        errorSummary: validation.errors.length ? { errors: validation.errors } : undefined,
      },
    });

    if (!validation.valid) {
      await this.prisma.libraryIngestionRun.update({
        where: { id: run.id },
        data: {
          status: IngestionStatus.FAILED,
          completedAt: new Date(),
        },
      });

      return {
        id: run.id,
        status: 'FAILED',
        acceptedCount: 0,
        rejectedCount: validation.errors.length,
        errors: validation.errors,
      };
    }

    const models = payload.models ?? [];
    const faults = payload.faults ?? [];
    const parts = payload.parts ?? [];
    const manuals = payload.manuals ?? [];
    const modelFaults = payload.modelFaults ?? [];
    const modelParts = payload.modelParts ?? [];

    const acceptedCount =
      models.length + faults.length + parts.length + manuals.length +
      modelFaults.length + modelParts.length;

    await this.prisma.$transaction(async (tx) => {
      for (const model of models) {
        await tx.boilerModel.upsert({
          where: { id: model.id },
          update: {
            manufacturerId: model.manufacturerId,
            modelName: model.modelName,
            series: model.series,
            fuelType: model.fuelType,
            productionStartYear: model.productionStartYear,
            productionEndYear: model.productionEndYear,
          },
          create: {
            id: model.id,
            manufacturerId: model.manufacturerId,
            modelName: model.modelName,
            series: model.series,
            fuelType: model.fuelType,
            productionStartYear: model.productionStartYear,
            productionEndYear: model.productionEndYear,
          },
        });
      }

      for (const fault of faults) {
        await tx.faultCode.upsert({
          where: { id: fault.id },
          update: {
            code: fault.code,
            title: fault.title,
            description: fault.description,
            severity: fault.severity,
          },
          create: {
            id: fault.id,
            code: fault.code,
            title: fault.title,
            description: fault.description,
            severity: fault.severity,
          },
        });
      }

      for (const part of parts) {
        await tx.part.upsert({
          where: { id: part.id },
          update: {
            sku: part.sku,
            name: part.name,
            brand: part.brand,
            unitPrice: part.unitPrice,
            aliases: part.aliases ?? [],
            inventoryStatus: part.inventoryStatus,
          },
          create: {
            id: part.id,
            sku: part.sku,
            name: part.name,
            brand: part.brand,
            unitPrice: part.unitPrice,
            aliases: part.aliases ?? [],
            inventoryStatus: part.inventoryStatus,
          },
        });
      }

      for (const manual of manuals) {
        await tx.manual.upsert({
          where: { id: manual.id },
          update: {
            boilerModelId: manual.boilerModelId,
            version: manual.version,
            language: manual.language,
            sourceUrl: manual.sourceUrl,
            addedAt: manual.addedAt ? new Date(manual.addedAt) : undefined,
            isValidated: manual.isValidated ?? undefined,
          },
          create: {
            id: manual.id,
            boilerModelId: manual.boilerModelId,
            version: manual.version,
            language: manual.language,
            sourceUrl: manual.sourceUrl,
            addedAt: manual.addedAt ? new Date(manual.addedAt) : undefined,
            isValidated: manual.isValidated ?? false,
          },
        });
      }

      if (modelFaults.length > 0) {
        await tx.modelFaultCode.createMany({
          data: modelFaults.map((link) => ({
            modelId: link.modelId,
            faultCodeId: link.faultCodeId,
          })),
          skipDuplicates: true,
        });
      }

      if (modelParts.length > 0) {
        await tx.modelPart.createMany({
          data: modelParts.map((link) => ({
            modelId: link.modelId,
            partId: link.partId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.libraryIngestionRun.update({
        where: { id: run.id },
        data: {
          status: IngestionStatus.COMPLETED,
          acceptedCount,
          rejectedCount: 0,
          completedAt: new Date(),
        },
      });
    });

    return {
      id: run.id,
      status: 'COMPLETED',
      acceptedCount,
      rejectedCount: 0,
    };
  }

  async getIngestRun(id: string) {
    const run = await this.prisma.libraryIngestionRun.findUnique({ where: { id } });
    if (!run) {
      throw new NotFoundException('Ingestion run not found');
    }
    return run;
  }

  private normalizePagination(page?: number, pageSize?: number) {
    const safePage = page && page > 0 ? Math.floor(page) : 1;
    const safeSize = pageSize && pageSize > 0 ? Math.floor(pageSize) : 25;
    const limitedSize = Math.min(safeSize, 100);

    return {
      page: safePage,
      pageSize: limitedSize,
      withTotal: (total: number) => ({ total, page: safePage, pageSize: limitedSize }),
    };
  }

  private buildSearchWhere(query: LibrarySearchQueryDto): Prisma.BoilerModelWhereInput {
    const where: Prisma.BoilerModelWhereInput = { isDeleted: false };

    if (query.model) {
      where.modelName = { contains: query.model, mode: 'insensitive' };
    }

    if (query.manufacturer) {
      where.manufacturerId = { contains: query.manufacturer, mode: 'insensitive' };
    }

    if (query.faultCode) {
      where.modelFaultCodes = {
        some: { faultCode: { code: { equals: query.faultCode } } },
      };
    }

    if (query.part) {
      where.modelParts = {
        some: { part: { name: { contains: query.part, mode: 'insensitive' } } },
      };
    }

    if (query.q) {
      where.OR = [
        { modelName: { contains: query.q, mode: 'insensitive' } },
        { manufacturerId: { contains: query.q, mode: 'insensitive' } },
        { modelFaultCodes: { some: { faultCode: { code: { contains: query.q, mode: 'insensitive' } } } } },
        { modelParts: { some: { part: { name: { contains: query.q, mode: 'insensitive' } } } } },
      ];
    }

    return where;
  }

  private mapModel(model: ModelWithOptionalManuals, includeManuals = false): LibraryModelDto {
    return {
      id: model.id,
      manufacturerId: model.manufacturerId ?? null,
      modelName: model.modelName,
      series: model.series ?? null,
      fuelType: model.fuelType ?? null,
      productionStartYear: model.productionStartYear ?? null,
      productionEndYear: model.productionEndYear ?? null,
      parts: (model.modelParts ?? []).map((link) => this.mapPart(link.part)),
      faultCodes: (model.modelFaultCodes ?? []).map((link) =>
        this.mapFault(link.faultCode),
      ),
      manuals: includeManuals
        ? (model.manuals ?? []).map((manual) => this.mapManual(manual))
        : undefined,
    };
  }

  private mapPart(part: PartRecord): LibraryPartDto {
    return {
      id: part.id,
      sku: part.sku,
      name: part.name,
      brand: part.brand ?? null,
      unitPrice: part.unitPrice ? part.unitPrice.toString() : null,
      aliases: part.aliases ?? [],
      inventoryStatus: part.inventoryStatus ?? null,
    };
  }

  private mapFault(fault: FaultRecord): LibraryFaultDto {
    return {
      id: fault.id,
      code: fault.code,
      title: fault.title,
      description: fault.description ?? null,
      severity: fault.severity ?? null,
    };
  }

  private mapManual(manual: ManualRecord): LibraryManualDto {
    return {
      id: manual.id,
      boilerModelId: manual.boilerModelId,
      version: manual.version ?? null,
      language: manual.language ?? null,
      sourceUrl: manual.sourceUrl ?? null,
      addedAt: manual.addedAt ? manual.addedAt.toISOString() : null,
      isValidated: manual.isValidated ?? false,
    };
  }

  private validateModels(models: LibraryModelIngestDto[], errors: IngestValidationError[]) {
    models.forEach((model, index) => {
      if (!model.id) {
        errors.push({ path: `models[${index}].id`, message: 'id is required' });
      }
      if (!model.modelName) {
        errors.push({ path: `models[${index}].modelName`, message: 'modelName is required' });
      }
    });
  }

  private validateFaults(faults: FaultCodeIngestDto[], errors: IngestValidationError[]) {
    faults.forEach((fault, index) => {
      if (!fault.id) {
        errors.push({ path: `faults[${index}].id`, message: 'id is required' });
      }
      if (!fault.code) {
        errors.push({ path: `faults[${index}].code`, message: 'code is required' });
      }
      if (!fault.title) {
        errors.push({ path: `faults[${index}].title`, message: 'title is required' });
      }
    });
  }

  private validateParts(parts: PartIngestDto[], errors: IngestValidationError[]) {
    parts.forEach((part, index) => {
      if (!part.id) {
        errors.push({ path: `parts[${index}].id`, message: 'id is required' });
      }
      if (!part.sku) {
        errors.push({ path: `parts[${index}].sku`, message: 'sku is required' });
      }
      if (!part.name) {
        errors.push({ path: `parts[${index}].name`, message: 'name is required' });
      }
    });
  }

  private validateManuals(manuals: ManualIngestDto[], errors: IngestValidationError[]) {
    manuals.forEach((manual, index) => {
      if (!manual.id) {
        errors.push({ path: `manuals[${index}].id`, message: 'id is required' });
      }
      if (!manual.boilerModelId) {
        errors.push({ path: `manuals[${index}].boilerModelId`, message: 'boilerModelId is required' });
      }
    });
  }

  private validateLinks(
    links: Array<ModelFaultLinkDto | ModelPartLinkDto>,
    label: string,
    errors: IngestValidationError[],
  ) {
    links.forEach((link, index) => {
      if (!link.modelId) {
        errors.push({ path: `${label}[${index}].modelId`, message: 'modelId is required' });
      }
      if ('faultCodeId' in link && !link.faultCodeId) {
        errors.push({ path: `${label}[${index}].faultCodeId`, message: 'faultCodeId is required' });
      }
      if ('partId' in link && !link.partId) {
        errors.push({ path: `${label}[${index}].partId`, message: 'partId is required' });
      }
    });
  }
}
