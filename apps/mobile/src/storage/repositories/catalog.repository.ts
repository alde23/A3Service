import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import BoilerModel from '../models/BoilerModel';
import Part from '../models/Part';
import FaultCode from '../models/FaultCode';
import TechnicalProperty from '../models/TechnicalProperty';
import ReferenceTable from '../models/ReferenceTable';

const boilerModelsCollection = database.get<BoilerModel>('boiler_models');
const partsCollection = database.get<Part>('parts');
const faultCodesCollection = database.get<FaultCode>('fault_codes');
const propertiesCollection = database.get<TechnicalProperty>('technical_properties');
const referenceTablesCollection = database.get<ReferenceTable>('reference_tables');

export async function searchLocalBoilerModels(query: string): Promise<BoilerModel[]> {
  const clean = query.trim();
  if (clean.length === 0) {
    return await boilerModelsCollection.query(Q.take(30)).fetch();
  }
  return await boilerModelsCollection
    .query(
      Q.or(
        Q.where('model_name', Q.like(`%${Q.sanitizeLikeString(clean)}%`)),
        Q.where('series', Q.like(`%${Q.sanitizeLikeString(clean)}%`))
      ),
      Q.take(50)
    )
    .fetch();
}

export async function searchLocalParts(query: string): Promise<Part[]> {
  const clean = query.trim();
  if (clean.length === 0) {
    return await partsCollection.query(Q.take(30)).fetch();
  }
  return await partsCollection
    .query(
      Q.or(
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(clean)}%`)),
        Q.where('sku', Q.like(`%${Q.sanitizeLikeString(clean)}%`)),
        Q.where('brand', Q.like(`%${Q.sanitizeLikeString(clean)}%`))
      ),
      Q.take(50)
    )
    .fetch();
}

export async function searchLocalFaultCodes(query: string): Promise<FaultCode[]> {
  const clean = query.trim();
  if (clean.length === 0) {
    return await faultCodesCollection.query(Q.take(30)).fetch();
  }
  return await faultCodesCollection
    .query(
      Q.or(
        Q.where('code', Q.like(`%${Q.sanitizeLikeString(clean)}%`)),
        Q.where('title', Q.like(`%${Q.sanitizeLikeString(clean)}%`))
      ),
      Q.take(50)
    )
    .fetch();
}

export async function getReferenceTableForModel(boilerModelId: string) {
  const refs = await referenceTablesCollection
    .query(Q.where('boiler_model_id', boilerModelId))
    .fetch();

  const results = [];
  for (const ref of refs) {
    const prop = await propertiesCollection.find(ref.propertyId);
    results.push({
      code: prop.code,
      label: prop.label,
      unit: prop.unit,
      min: ref.minValue,
      max: ref.maxValue,
      required: ref.required,
      refId: ref.id,
      propertyId: prop.id,
    });
  }
  return results;
}

export async function upsertCatalogFromServer(
  table: 'boiler_models' | 'parts' | 'fault_codes' | 'technical_properties' | 'reference_tables' | 'technical_specs' | 'status_codes' | 'diagnostic_codes' | 'safety_warnings' | 'maintenance_tasks' | 'model_parts',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
) {
  if (items.length === 0) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collection = database.get<any>(table);
  let changed = 0;

  await database.write(async () => {
    for (const item of items) {
      const existing = await collection
        .query(Q.where('remote_id', item.id), Q.take(1))
        .fetch();

      if (existing.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await existing[0].update((record: any) => {
          mapCatalogItem(table, record, item);
        });
        changed += 1;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await collection.create((record: any) => {
          record.remoteId = item.id;
          mapCatalogItem(table, record, item);
        });
        changed += 1;
      }
    }
  });

  return changed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCatalogItem(table: string, record: any, item: any) {
  switch (table) {
    case 'boiler_models':
      record.manufacturerId = item.manufacturerId ?? null;
      record.modelName = item.modelName;
      record.series = item.series ?? null;
      record.fuelType = item.fuelType ?? null;
      record.productionStartYear = item.productionStartYear ?? null;
      record.productionEndYear = item.productionEndYear ?? null;
      record.documentType = item.documentType ?? null;
      record.language = item.language ?? null;
      record.searchTerms = item.searchTerms ?? null;
      record.derivedGuidance = item.derivedGuidance ?? null;
      break;
    case 'parts':
      record.sku = item.sku;
      record.name = item.name;
      record.brand = item.brand ?? null;
      record.unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (item.unitPrice ? parseFloat(item.unitPrice) : null);
      record.inventoryStatus = item.inventoryStatus ?? null;
      record.aliases = item.aliases ?? null;
      break;
    case 'fault_codes':
      record.code = item.code;
      record.title = item.title;
      record.description = item.description ?? null;
      record.severity = item.severity ?? null;
      record.modelId = item.modelId;
      record.possibleCauses = item.possibleCauses ?? null;
      record.manufacturerSteps = item.manufacturerSteps ?? null;
      record.cautionsOrNotes = item.cautionsOrNotes ?? null;
      record.symptoms = item.symptoms ?? null;
      record.relatedComponents = item.relatedComponents ?? null;
      record.safetyLevel = item.safetyLevel ?? null;
      record.searchTags = item.searchTags ?? null;
      record.sourceRefs = item.sourceRefs ?? null;
      record.confidence = item.confidence ?? null;
      record.reviewRequired = item.reviewRequired ?? null;
      break;
    case 'technical_specs':
      record.modelId = item.modelId;
      record.parameter = item.parameter;
      record.value = item.value;
      record.unit = item.unit ?? null;
      record.appliesToModels = item.appliesToModels ?? null;
      record.category = item.category ?? null;
      record.sourceRefs = item.sourceRefs ?? null;
      record.confidence = item.confidence ?? null;
      record.reviewRequired = item.reviewRequired ?? null;
      break;
    case 'status_codes':
      record.modelId = item.modelId;
      record.code = item.code;
      record.description = item.description ?? null;
      record.meaning = item.meaning ?? null;
      record.sourceRefs = item.sourceRefs ?? null;
      break;
    case 'diagnostic_codes':
      record.modelId = item.modelId;
      record.code = item.code;
      record.description = item.description ?? null;
      record.level = item.level ?? null;
      record.sourceRefs = item.sourceRefs ?? null;
      break;
    case 'safety_warnings':
      record.modelId = item.modelId;
      record.warningType = item.warningType ?? null;
      record.description = item.description;
      record.sourceRefs = item.sourceRefs ?? null;
      break;
    case 'maintenance_tasks':
      record.modelId = item.modelId;
      record.task = item.task;
      record.interval = item.interval ?? null;
      record.steps = item.steps ?? null;
      record.sourceRefs = item.sourceRefs ?? null;
      break;
    case 'model_parts':
      record.modelId = item.modelId;
      record.partId = item.partId;
      break;
    case 'technical_properties':
      record.code = item.code;
      record.label = item.label;
      record.unit = item.unit ?? null;
      record.description = item.description ?? null;
      break;
    case 'reference_tables':
      record.boilerModelId = item.boilerModelId;
      record.propertyId = item.propertyId;
      record.minValue = typeof item.minValue === 'number' ? item.minValue : (item.minValue ? parseFloat(item.minValue) : null);
      record.maxValue = typeof item.maxValue === 'number' ? item.maxValue : (item.maxValue ? parseFloat(item.maxValue) : null);
      record.required = Boolean(item.required);
      break;
  }
}
