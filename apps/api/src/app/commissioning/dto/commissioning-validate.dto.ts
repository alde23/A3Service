export type CommissioningReadingDto = {
  code: string;
  value: number;
};

export type CommissioningValidateRequestDto = {
  modelId: string;
  readings: CommissioningReadingDto[];
};

export type CommissioningValidationIssueDto = {
  code: string;
  value: number | null;
  min: string | null;
  max: string | null;
  unit: string | null;
  status: 'OK' | 'OUT_OF_RANGE' | 'UNKNOWN' | 'MISSING';
};

export type CommissioningValidateResponseDto = {
  modelId: string;
  valid: boolean;
  missingRequired: string[];
  issues: CommissioningValidationIssueDto[];
};

export type CommissioningReferenceItemDto = {
  code: string;
  label: string;
  unit: string | null;
  min: string | null;
  max: string | null;
  required: boolean;
};

export type CommissioningReferenceResponseDto = {
  modelId: string;
  items: CommissioningReferenceItemDto[];
};
