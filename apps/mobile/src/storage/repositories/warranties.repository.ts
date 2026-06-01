import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import Warranty from '../models/Warranty';
import ReferenceTable from '../models/ReferenceTable';
import TechnicalProperty from '../models/TechnicalProperty';
import { enqueueSyncOperationInCurrentWriter } from './sync-queue.repository';

const warrantiesCollection = database.get<Warranty>('warranties');
const referenceTablesCollection = database.get<ReferenceTable>('reference_tables');
const propertiesCollection = database.get<TechnicalProperty>('technical_properties');

export type LocalCommissioningReading = {
  code: string;
  value: number;
};

export type LocalValidationIssue = {
  code: string;
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string | null;
  status: 'OK' | 'OUT_OF_RANGE' | 'MISSING' | 'UNKNOWN';
};

export type LocalValidationResult = {
  modelId: string;
  valid: boolean;
  missingRequired: string[];
  issues: LocalValidationIssue[];
};

export async function localValidateCommissioning(
  boilerModelId: string,
  readings: LocalCommissioningReading[]
): Promise<LocalValidationResult> {
  const references = await referenceTablesCollection
    .query(Q.where('boiler_model_id', boilerModelId))
    .fetch();

  const referenceByCode = new Map<string, { ref: ReferenceTable; prop: TechnicalProperty }>();
  for (const ref of references) {
    const prop = await propertiesCollection.find(ref.propertyId);
    referenceByCode.set(prop.code, { ref, prop });
  }

  const providedCodes = new Set<string>();
  const issues: LocalValidationIssue[] = [];

  for (const reading of readings) {
    providedCodes.add(reading.code);
    const entry = referenceByCode.get(reading.code);

    if (!entry) {
      issues.push({
        code: reading.code,
        value: reading.value,
        min: null,
        max: null,
        unit: null,
        status: 'UNKNOWN',
      });
      continue;
    }

    const { ref, prop } = entry;
    const min = ref.minValue;
    const max = ref.maxValue;

    let status: LocalValidationIssue['status'] = 'OK';
    if (min !== null && reading.value < min) {
      status = 'OUT_OF_RANGE';
    } else if (max !== null && reading.value > max) {
      status = 'OUT_OF_RANGE';
    }

    issues.push({
      code: prop.code,
      value: reading.value,
      min,
      max,
      unit: prop.unit,
      status,
    });
  }

  const missingRequired: string[] = [];
  for (const ref of references) {
    const prop = await propertiesCollection.find(ref.propertyId);
    if (ref.required && !providedCodes.has(prop.code)) {
      missingRequired.push(prop.code);
      issues.push({
        code: prop.code,
        value: null,
        min: ref.minValue,
        max: ref.maxValue,
        unit: prop.unit,
        status: 'MISSING',
      });
    }
  }

  const valid = missingRequired.length === 0 && issues.every((issue) => issue.status === 'OK');

  return {
    modelId: boilerModelId,
    valid,
    missingRequired,
    issues,
  };
}

export async function createWarranty(
  boilerModelId: string,
  jobId: string | null,
  durationMonths: number,
  notes: string,
  readings: LocalCommissioningReading[]
): Promise<Warranty> {
  let createdWarranty!: Warranty;
  await database.write(async () => {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    createdWarranty = await warrantiesCollection.create((warranty) => {
      warranty.boilerModelId = boilerModelId;
      warranty.jobId = jobId;
      warranty.startDate = now;
      warranty.durationMonths = durationMonths;
      warranty.expiresAt = expiresAt;
      warranty.status = 'ACTIVE';
      warranty.notes = notes;
      warranty.remoteId = null;
    });

    await enqueueSyncOperationInCurrentWriter({
      tableName: 'warranties',
      recordId: createdWarranty.id,
      operation: 'INSERT',
      payload: JSON.stringify({
        boilerModelId,
        jobId,
        startDate: now.toISOString(),
        durationMonths,
        expiresAt: expiresAt.toISOString(),
        status: 'ACTIVE',
        notes,
        readings, // Pass commissioning readings directly to allow backend validating on push!
        localWarrantyId: createdWarranty.id,
      }),
    });
  });

  return createdWarranty;
}

export async function getWarrantyForJob(jobId: string): Promise<Warranty | null> {
  const records = await warrantiesCollection
    .query(Q.where('job_id', jobId), Q.take(1))
    .fetch();
  return records[0] ?? null;
}
