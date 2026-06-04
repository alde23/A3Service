import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LibrarySearchQueryDto } from './dto/library-search.dto';
import { LibraryIngestDto } from './dto/library-ingest.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: LibrarySearchQueryDto) {
    const q = query.q?.trim();
    const type = query.type;
    const manufacturer = query.manufacturer?.trim();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    if (!q && !type && !manufacturer) {
      return [];
    }

    const fetchModels = !type || type === 'model' || type === 'all';
    const fetchFaults = !type || type === 'fault' || type === 'all';
    const fetchParts  = !type || type === 'part'  || type === 'all';

    const [models, faultCodes, parts] = await Promise.all([
      fetchModels ? this.prisma.boilerModel.findMany({
        where: {
          AND: [
            { manufacturerId: { not: 'Unknown' } },
            manufacturer ? { manufacturerId: { equals: manufacturer, mode: 'insensitive' } } : {},
            q ? {
              OR: [
                { modelName:      { contains: q, mode: 'insensitive' } },
                { manufacturerId: { contains: q, mode: 'insensitive' } },
                { series:        { contains: q, mode: 'insensitive' } },
              ],
            } : {},
          ]
        },
        skip,
        take: pageSize,
        select: { id: true, modelName: true, manufacturerId: true, documentType: true },
      }) : Promise.resolve([]),

      fetchFaults ? this.prisma.faultCode.findMany({
        where: {
          AND: [
            manufacturer ? { model: { manufacturerId: { equals: manufacturer, mode: 'insensitive' } } } : {},
            q ? {
              OR: [
                { code:        { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { model: { modelName: { contains: q, mode: 'insensitive' } } },
                { model: { manufacturerId: { contains: q, mode: 'insensitive' } } },
              ],
            } : {},
          ]
        },
        skip,
        take: pageSize,
        select: { id: true, code: true, description: true, severity: true, modelId: true, model: { select: { manufacturerId: true, modelName: true } } },
      }) : Promise.resolve([]),

      fetchParts ? this.prisma.part.findMany({
        where: {
          AND: [
            manufacturer ? { brand: { equals: manufacturer, mode: 'insensitive' } } : {},
            q ? {
              OR: [
                { name:  { contains: q, mode: 'insensitive' } },
                { sku:   { contains: q, mode: 'insensitive' } },
                { brand: { contains: q, mode: 'insensitive' } },
              ],
            } : {},
          ]
        },
        skip,
        take: pageSize,
        select: { id: true, sku: true, name: true, brand: true, inventoryStatus: true },
      }) : Promise.resolve([]),
    ]);

    const results = [
      ...models.map(m => ({
        id:          m.id,
        title:       m.modelName,
        category:    m.manufacturerId ?? 'Unknown',
        type:        'model' as const,
        description: m.documentType && m.documentType !== 'Installation Manual' ? m.documentType : undefined,
      })),
      ...faultCodes.map(f => ({
        id:          f.id,
        title:       f.code,
        category:    `Fault Code · ${f.model?.manufacturerId || 'Unknown'} ${f.model?.modelName || ''} · ${f.severity ?? 'Unknown'}`.trim().replace(/ ·$/, ''),
        type:        'fault' as const,
        description: f.description ?? undefined,
      })),
      ...parts.map(p => ({
        id:          p.id,
        title:       p.name,
        category:    `Part · ${p.brand ?? 'Unknown'} · ${p.sku}`,
        type:        'part' as const,
        description: p.inventoryStatus ?? undefined,
      })),
    ];

    return results;
  }

  async getManufacturers() {
    const records = await this.prisma.boilerModel.findMany({
      select: { manufacturerId: true },
      distinct: ['manufacturerId'],
      where: { manufacturerId: { not: null } },
    });

    const uniqueManufacturers = new Set(
      records
        .map(r => r.manufacturerId)
        .filter((name): name is string => typeof name === 'string' && name.trim().toLowerCase() !== 'unknown')
        .map(name => {
          const trimmed = name.trim();
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        })
    );
    
    return Array.from(uniqueManufacturers);
  }

  async listModels(page?: number, pageSize?: number) {
    const take = pageSize ?? 20;
    const skip = page && page > 1 ? (page - 1) * take : 0;
    const rows = await this.prisma.boilerModel.findMany({
      where: { manufacturerId: { not: 'Unknown' } },
      skip,
      take,
      select: {
        id:             true,
        modelName:      true,
        manufacturerId: true,
        documentType:   true,
        series:         true,
        fuelType:       true,
        language:       true,
        searchTerms:    true,
        derivedGuidance: true,
        faultCodes:     true,
        technicalSpecs: true,
        statusCodes:    true,
        diagnosticCodes: true,
        safetyWarnings: true,
        maintenanceTasks: true,
        modelParts:     true,
      },
    });
    // Map to the shape expected by the mobile client
    // Map to the shape expected by the mobile client sync
    return rows.map(r => ({
      id:             r.id,
      modelName:      r.modelName,
      manufacturerId: r.manufacturerId ?? 'Unknown',
      documentType:   r.documentType,
      series:         r.series,
      fuelType:       r.fuelType,
      language:       r.language,
      searchTerms:    r.searchTerms,
      derivedGuidance: r.derivedGuidance,
      faultCodes:     r.faultCodes,
      technicalSpecs: r.technicalSpecs,
      statusCodes:    r.statusCodes,
      diagnosticCodes: r.diagnosticCodes,
      safetyWarnings: r.safetyWarnings,
      maintenanceTasks: r.maintenanceTasks,
      modelParts:     r.modelParts,
    }));
  }

  async getModel(id: string) {
    const model = await this.prisma.boilerModel.findUnique({ 
      where: { id },
      include: {
        faultCodes: true,
        technicalSpecs: true,
        statusCodes: true,
        diagnosticCodes: true,
        safetyWarnings: true,
        maintenanceTasks: true,
        modelParts: {
          include: { part: true }
        }
      }
    });

    if (!model) return null;

    // Filter out unknown tasks
    if (model.maintenanceTasks) {
      model.maintenanceTasks = model.maintenanceTasks.filter(t => t.task !== 'UNKNOWN');
    }

    // Extract description from sourceRefs if empty
    if (model.safetyWarnings) {
      model.safetyWarnings = model.safetyWarnings.map(w => {
        if (!w.description || w.description.trim() === '') {
          const refs = w.sourceRefs as any[];
          if (refs && refs.length > 0 && refs[0].source_quote) {
            w.description = refs[0].source_quote;
          }
        }
        return w;
      }).filter(w => w.description && w.description.trim() !== '');
    }

    return model;
  }

  async getFaultById(id: string) {
    return this.prisma.faultCode.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, modelName: true, manufacturerId: true }
        }
      }
    });
  }

  async getFaultByCode(code: string) {
    throw new NotFoundException('Fault code query by individual code is retired in favor of full model JSON');
  }

  async getPart(id: string) {
    return this.prisma.part.findUnique({ 
      where: { id },
      include: {
        modelParts: {
          include: { model: true }
        }
      }
    });
  }

  async validateIngest(body: any) {
    return { valid: true, errors: [] };
  }

  async ingest(dto: LibraryIngestDto) {
    const documentMeta = dto.document_meta || {};
    const manufacturerName = documentMeta.brand_name || 'Unknown';
    const modelName = (documentMeta.model_names && documentMeta.model_names.length > 0) 
      ? documentMeta.model_names[0] 
      : (documentMeta.product_family || documentMeta.product_name || 'Unknown');

    const upsertedModel = await this.prisma.$transaction(async (tx) => {
      const model = await tx.boilerModel.create({
        data: {
          manufacturerId: manufacturerName,
          modelName: modelName,
          documentType: documentMeta.document_type || 'Installation Manual',
          language: documentMeta.language || 'en',
          searchTerms: dto.search_terms ? JSON.parse(JSON.stringify(dto.search_terms)) : [],
        }
      });

      if (dto.fault_codes?.length) {
        await tx.faultCode.createMany({
          data: dto.fault_codes.map(f => ({
            code: f.code || 'UNKNOWN',
            description: f.description,
            possibleCauses: f.possible_causes || [],
            manufacturerSteps: f.manufacturer_steps ? JSON.parse(JSON.stringify(f.manufacturer_steps)) : null,
            cautionsOrNotes: f.cautions_or_notes || [],
            symptoms: f.symptoms || [],
            relatedComponents: f.related_components || [],
            severity: f.severity,
            safetyLevel: f.safety_level,
            searchTags: f.search_tags || [],
            sourceRefs: f.source_refs ? JSON.parse(JSON.stringify(f.source_refs)) : null,
            confidence: f.confidence,
            reviewRequired: f.review_required,
            modelId: model.id
          }))
        });
      }

      if (dto.technical_specs?.length) {
        await tx.technicalSpec.createMany({
          data: dto.technical_specs.map(t => ({
            parameter: t.parameter || 'UNKNOWN',
            value: t.value || '',
            unit: t.unit,
            appliesToModels: t.applies_to_models || [],
            category: t.category,
            sourceRefs: t.source_refs ? JSON.parse(JSON.stringify(t.source_refs)) : null,
            confidence: t.confidence,
            reviewRequired: t.review_required,
            modelId: model.id
          }))
        });
      }

      if (dto.status_codes?.length) {
        await tx.statusCode.createMany({
          data: dto.status_codes.map(s => ({
            code: s.code || 'UNKNOWN',
            description: s.description,
            meaning: s.meaning,
            sourceRefs: s.source_refs ? JSON.parse(JSON.stringify(s.source_refs)) : null,
            modelId: model.id
          }))
        });
      }

      if (dto.diagnostic_codes?.length) {
        await tx.diagnosticCode.createMany({
          data: dto.diagnostic_codes.map(d => ({
            code: d.code || 'UNKNOWN',
            description: d.description,
            level: d.level,
            sourceRefs: d.source_refs ? JSON.parse(JSON.stringify(d.source_refs)) : null,
            modelId: model.id
          }))
        });
      }

      if (dto.safety_warnings?.length) {
        await tx.safetyWarning.createMany({
          data: dto.safety_warnings.map(s => ({
            warningType: s.warning_type,
            description: s.description || '',
            sourceRefs: s.source_refs ? JSON.parse(JSON.stringify(s.source_refs)) : null,
            modelId: model.id
          }))
        });
      }

      if (dto.maintenance_tasks?.length) {
        await tx.maintenanceTask.createMany({
          data: dto.maintenance_tasks.map(m => ({
            task: m.task || 'UNKNOWN',
            interval: m.interval,
            steps: m.steps || [],
            sourceRefs: m.source_refs ? JSON.parse(JSON.stringify(m.source_refs)) : null,
            modelId: model.id
          }))
        });
      }

      return model;
    });

    return { status: 'success', id: upsertedModel.id };
  }

  async getIngestRun(id: string) {
    return { id, status: 'COMPLETED' };
  }
}
