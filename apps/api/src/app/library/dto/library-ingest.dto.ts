import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, ValidateNested, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class SourceRefDto {
  @IsOptional() @IsNumber() page_number?: number;
  @IsOptional() @IsString() section_title?: string;
  @IsOptional() @IsString() table_title?: string;
  @IsOptional() @IsString() source_quote?: string;
}

export class ManufacturerStepDto {
  @IsOptional() @IsString() step?: string;
  @IsOptional() @IsString() action?: string;
}

export class DocumentMetaDto {
  @IsOptional() @IsString() brand_name?: string;
  @IsOptional() @IsString() product_name?: string;
  @IsOptional() @IsString() product_family?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) model_names?: string[];
  @IsOptional() @IsString() document_type?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() series?: string;
}

export class FaultCodeIngestDto {
  @IsDefined() @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) possible_causes?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ManufacturerStepDto) manufacturer_steps?: ManufacturerStepDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) cautions_or_notes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) related_components?: string[];
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() safety_level?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) search_tags?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
  @IsOptional() @IsNumber() confidence?: number;
  @IsOptional() @IsBoolean() review_required?: boolean;
}

export class TechnicalSpecIngestDto {
  @IsDefined() @IsString() parameter!: string;
  @IsDefined() @IsString() value!: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) applies_to_models?: string[];
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
  @IsOptional() @IsNumber() confidence?: number;
  @IsOptional() @IsBoolean() review_required?: boolean;
}

export class StatusCodeIngestDto {
  @IsDefined() @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() meaning?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
}

export class DiagnosticCodeIngestDto {
  @IsDefined() @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
}

export class SafetyWarningIngestDto {
  @IsOptional() @IsString() warning_type?: string;
  @IsDefined() @IsString() description!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
}

export class MaintenanceTaskIngestDto {
  @IsDefined() @IsString() task!: string;
  @IsOptional() @IsString() interval?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) steps?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SourceRefDto) source_refs?: SourceRefDto[];
}

export class LibraryIngestDto {
  @IsOptional() @ValidateNested() @Type(() => DocumentMetaDto) document_meta?: DocumentMetaDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FaultCodeIngestDto) fault_codes?: FaultCodeIngestDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TechnicalSpecIngestDto) technical_specs?: TechnicalSpecIngestDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => StatusCodeIngestDto) status_codes?: StatusCodeIngestDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DiagnosticCodeIngestDto) diagnostic_codes?: DiagnosticCodeIngestDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SafetyWarningIngestDto) safety_warnings?: SafetyWarningIngestDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MaintenanceTaskIngestDto) maintenance_tasks?: MaintenanceTaskIngestDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) search_terms?: string[];
}
