export type LibraryPaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
};

export type LibraryPartDto = {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  unitPrice?: string | null;
  aliases: string[];
  inventoryStatus?: string | null;
};

export type LibraryFaultDto = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity?: string | null;
};

export type LibraryManualDto = {
  id: string;
  boilerModelId: string;
  version?: string | null;
  language?: string | null;
  sourceUrl?: string | null;
  addedAt?: string | null;
  isValidated: boolean;
};

export type LibraryModelDto = {
  id: string;
  manufacturerId?: string | null;
  modelName: string;
  series?: string | null;
  fuelType?: string | null;
  productionStartYear?: number | null;
  productionEndYear?: number | null;
  parts: LibraryPartDto[];
  faultCodes: LibraryFaultDto[];
  manuals?: LibraryManualDto[];
};

export type LibrarySearchResponse = {
  items: LibraryModelDto[];
  meta: LibraryPaginationMeta;
};

export type LibraryModelListResponse = {
  items: LibraryModelDto[];
  meta: LibraryPaginationMeta;
};

export type LibraryFaultResponse = {
  fault: LibraryFaultDto;
  models: LibraryModelDto[];
};

export type LibraryPartResponse = {
  part: LibraryPartDto;
  models: LibraryModelDto[];
};
