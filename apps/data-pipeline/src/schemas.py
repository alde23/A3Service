from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


SchemaVersion = Literal["0.2.0"]


class SourceRef(BaseModel):
    """
    Reference back to the original manual.

    Page numbers are optional because not every extraction method reliably exposes
    page-level information. When available, they are very valuable for review.
    """

    page_number: int | None = Field(
        default=None,
        description="Page number in the source PDF, if known.",
    )
    section_title: str | None = Field(
        default=None,
        description="Manual section title where the information was found.",
    )
    table_title: str | None = Field(
        default=None,
        description="Table title or figure title, if the information came from a table or figure.",
    )
    source_quote: str | None = Field(
        default=None,
        description="Short exact quote from the manual supporting this extracted data.",
    )


class DocumentMeta(BaseModel):
    brand_name: str = Field(
        description="Manufacturer or brand name, e.g., Vaillant, Bosch."
    )
    product_family: str | None = Field(
        default=None,
        description="Product family or series, e.g., ecoTEC plus, BGH96.",
    )
    model_names: list[str] = Field(
        default_factory=list,
        description="Specific model names or model numbers covered by the manual.",
    )
    manual_type: str | None = Field(
        default=None,
        description="Type of manual, e.g., installation, service, operating, installation_and_maintenance.",
    )
    document_title: str | None = Field(
        default=None,
        description="Title of the manual as written on the cover or first pages.",
    )
    document_code: str | None = Field(
        default=None,
        description="Manufacturer document number, publication code, or revision code if visible.",
    )
    publication_date: str | None = Field(
        default=None,
        description="Manual publication date or revision date if visible.",
    )
    language: str | None = Field(
        default=None,
        description="Primary language of the manual, e.g., en, de, bs.",
    )
    region: str | None = Field(
        default=None,
        description="Target region/country if visible, e.g., GB, IE, US, Canada, EU.",
    )
    source_file: str | None = Field(
        default=None,
        description="PDF filename. This may be filled by the pipeline after extraction.",
    )
    file_hash: str | None = Field(
        default=None,
        description="SHA-256 hash of the source PDF. This is filled by the pipeline.",
    )


class TechnicalSpec(BaseModel):
    parameter: str = Field(
        description="The name of the technical specification, e.g., Maximum heat output."
    )
    value: str = Field(
        description="The extracted value exactly as represented in the source, including range if relevant."
    )
    unit: str | None = Field(
        default=None,
        description="Unit of measure, e.g., kW, bar, mbar, V, Hz, kg, mm.",
    )
    applies_to_models: list[str] = Field(
        default_factory=list,
        description="Model names/numbers this specification applies to. Empty if unclear.",
    )
    category: str | None = Field(
        default=None,
        description="Specification category, e.g., gas, heating, electrical, dimensions, venting.",
    )
    source_refs: list[SourceRef] = Field(
        default_factory=list,
        description="Source references supporting this specification.",
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Extractor confidence between 0 and 1.",
    )
    review_required: bool = Field(
        description="True if the value is uncertain, ambiguous, incomplete, or needs human review."
    )


class FaultCode(BaseModel):
    code: str = Field(
        description="Exact fault code as written, e.g., F.22, EA, E1, FO."
    )
    description: str = Field(
        description="Manufacturer-stated fault description. Do not invent."
    )
    possible_causes: list[str] = Field(
        default_factory=list,
        description="Manufacturer-stated possible causes. Empty if not stated.",
    )
    manufacturer_steps: list[str] = Field(
        default_factory=list,
        description="Manufacturer-stated troubleshooting or corrective steps. Empty if not stated.",
    )
    cautions_or_notes: list[str] = Field(
        default_factory=list,
        description="Relevant manufacturer cautions, warnings, or notes connected to this fault.",
    )
    symptoms: list[str] = Field(
        default_factory=list,
        description="Symptoms of abnormal operation associated with this fault. Empty if not stated.",
    )
    related_components: list[str] = Field(
        default_factory=list,
        description="Components mentioned in relation to this fault, e.g., pressure switch, flame sensor.",
    )
    severity: Literal["unknown", "low", "medium", "high", "critical"] = Field(
        default="unknown",
        description="Severity if clearly inferable from the manual wording. Use unknown if unclear.",
    )
    safety_level: Literal["unknown", "normal", "caution", "warning", "danger"] = Field(
        default="unknown",
        description="Safety level if explicitly connected to the fault. Use unknown if unclear.",
    )
    search_tags: list[str] = Field(
        default_factory=list,
        description="Short normalized tags useful for search, e.g., pressure, ignition, sensor.",
    )
    source_refs: list[SourceRef] = Field(
        default_factory=list,
        description="Source references supporting this fault code.",
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Extractor confidence between 0 and 1.",
    )
    review_required: bool = Field(
        description="True if the record is incomplete, ambiguous, or may need human review."
    )


class DiagnosticCode(BaseModel):
    code: str = Field(description="Exact diagnostic code, e.g., d.000, d.90.")
    description: str = Field(description="Meaning or setting description.")
    value_range: str | None = Field(
        default=None,
        description="Allowed value range if stated.",
    )
    default_value: str | None = Field(
        default=None,
        description="Default value if stated.",
    )
    unit: str | None = Field(default=None, description="Unit if stated.")
    adjustable: bool | None = Field(
        default=None,
        description="Whether the diagnostic value is adjustable, if stated.",
    )
    source_refs: list[SourceRef] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool


class StatusCode(BaseModel):
    code: str = Field(description="Exact status code, e.g., S.04, S.53.")
    meaning: str = Field(description="Manufacturer-stated meaning.")
    operating_mode: str | None = Field(
        default=None,
        description="Related mode if stated, e.g., heating, domestic hot water, frost protection.",
    )
    source_refs: list[SourceRef] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool


class SafetyWarning(BaseModel):
    warning_type: Literal["danger", "warning", "caution", "notice", "info", "unknown"] = Field(
        default="unknown",
        description="Type of safety message as stated in the manual.",
    )
    topic: str = Field(description="Short topic, e.g., gas smell, electrical shock, carbon monoxide.")
    text: str = Field(description="Warning text or summarized warning from the manual.")
    source_refs: list[SourceRef] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool


class MaintenanceTask(BaseModel):
    task_name: str = Field(description="Maintenance or inspection task name.")
    description: str | None = Field(
        default=None,
        description="Short task description if stated.",
    )
    interval: str | None = Field(
        default=None,
        description="Maintenance interval if stated, e.g., annually.",
    )
    required_qualification: str | None = Field(
        default=None,
        description="Required technician qualification if stated.",
    )
    source_refs: list[SourceRef] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool


class DerivedGuidanceStatus(BaseModel):
    """
    Placeholder for future technician-friendly guidance.

    This must not be filled with invented repair advice during raw extraction.
    It exists so future LLM/rule-based guidance can be stored separately from
    manufacturer-stated information.
    """

    status: Literal["not_generated", "generated", "reviewed"] = Field(
        default="not_generated"
    )
    technician_summary: str | None = None
    steps: list[str] = Field(default_factory=list)
    generated_from: list[str] = Field(default_factory=list)
    review_status: Literal["not_reviewed", "needs_review", "approved"] = Field(
        default="not_reviewed"
    )


class ExtractionMeta(BaseModel):
    overall_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall extraction confidence for this manual.",
    )
    review_required: bool = Field(
        description="True if any important section is missing, uncertain, or inconsistent."
    )
    missing_or_unclear_sections: list[str] = Field(
        default_factory=list,
        description="Sections that were expected but missing or unclear.",
    )
    extraction_notes: list[str] = Field(
        default_factory=list,
        description="Notes about extraction limitations or ambiguities.",
    )


class BoilerManualData(BaseModel):
    schema_version: SchemaVersion = Field(
        default="0.2.0",
        description="Schema version for this extracted manual JSON.",
    )
    document_meta: DocumentMeta
    technical_specs: list[TechnicalSpec] = Field(default_factory=list)
    fault_codes: list[FaultCode] = Field(default_factory=list)
    diagnostic_codes: list[DiagnosticCode] = Field(default_factory=list)
    status_codes: list[StatusCode] = Field(default_factory=list)
    safety_warnings: list[SafetyWarning] = Field(default_factory=list)
    maintenance_tasks: list[MaintenanceTask] = Field(default_factory=list)
    search_terms: list[str] = Field(
        default_factory=list,
        description="General search terms for this manual/product.",
    )
    derived_guidance: DerivedGuidanceStatus = Field(
        default_factory=DerivedGuidanceStatus
    )
    extraction_meta: ExtractionMeta