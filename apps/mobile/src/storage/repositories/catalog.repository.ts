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
  table: 'boiler_models' | 'parts' | 'fault_codes' | 'technical_properties' | 'reference_tables',
  items: any[]
) {
  if (items.length === 0) return 0;

  const collection = database.get<any>(table);
  let changed = 0;

  await database.write(async () => {
    for (const item of items) {
      const existing = await collection
        .query(Q.where('remote_id', item.id), Q.take(1))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record: any) => {
          mapCatalogItem(table, record, item);
        });
        changed += 1;
      } else {
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

function mapCatalogItem(table: string, record: any, item: any) {
  switch (table) {
    case 'boiler_models':
      record.manufacturerId = item.manufacturerId ?? null;
      record.modelName = item.modelName;
      record.series = item.series ?? null;
      record.fuelType = item.fuelType ?? null;
      record.productionStartYear = item.productionStartYear ?? null;
      record.productionEndYear = item.productionEndYear ?? null;
      break;
    case 'parts':
      record.sku = item.sku;
      record.name = item.name;
      record.brand = item.brand ?? null;
      record.unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (item.unitPrice ? parseFloat(item.unitPrice) : null);
      record.inventoryStatus = item.inventoryStatus ?? null;
      break;
    case 'fault_codes':
      record.code = item.code;
      record.title = item.title;
      record.description = item.description ?? null;
      record.severity = item.severity ?? null;
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
