export type LibraryModelIngestDto = {
  id: string;
  manufacturerId?: string;
  modelName: string;
  series?: string;
  fuelType?: string;
  productionStartYear?: number;
  productionEndYear?: number;
};

export type FaultCodeIngestDto = {
  id: string;
  code: string;
  title: string;
  description?: string;
  severity?: string;
};

export type PartIngestDto = {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  unitPrice?: number;
  aliases?: string[];
  inventoryStatus?: string;
};

export type ManualIngestDto = {
  id: string;
  boilerModelId: string;
  version?: string;
  language?: string;
  sourceUrl?: string;
  addedAt?: string;
  isValidated?: boolean;
};

export type ModelFaultLinkDto = {
  modelId: string;
  faultCodeId: string;
};

export type ModelPartLinkDto = {
  modelId: string;
  partId: string;
};

export type TechnicalPropertyIngestDto = {
  id: string;
  code: string;
  label: string;
  unit?: string;
  description?: string;
};

export type ReferenceTableIngestDto = {
  id: string;
  boilerModelId: string;
  propertyId: string;
  minValue?: number;
  maxValue?: number;
  required?: boolean;
};

export type LibraryIngestDto = {
  sourceVersion?: string;
  models?: LibraryModelIngestDto[];
  faults?: FaultCodeIngestDto[];
  parts?: PartIngestDto[];
  manuals?: ManualIngestDto[];
  technicalProperties?: TechnicalPropertyIngestDto[];
  referenceTables?: ReferenceTableIngestDto[];
  modelFaults?: ModelFaultLinkDto[];
  modelParts?: ModelPartLinkDto[];
};

export type IngestValidationError = {
  path: string;
  message: string;
};

export type IngestValidationResult = {
  valid: boolean;
  errors: IngestValidationError[];
  counts: {
    models: number;
    faults: number;
    parts: number;
    manuals: number;
    modelFaults: number;
    modelParts: number;
  };
};

export type IngestRunResponse = {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  acceptedCount: number;
  rejectedCount: number;
  errors?: IngestValidationError[];
};
