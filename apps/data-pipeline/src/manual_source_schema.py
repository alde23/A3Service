from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


SourceAuthority = Literal[
    "official",
    "official_regional",
    "third_party",
    "vendor_or_distributor",
    "unknown",
]

CollectorName = Literal[
    "bosch_homecomfort",
    "direct_pdf",
    "freeboilermanuals",
    "site_pdf_crawler",
    "viessmann_us",
]

DownloadStatus = Literal[
    "pending",
    "downloaded",
    "skipped",
    "failed",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SourceRegistryEntry(BaseModel):
    brand: str
    source_name: str
    source_url: str
    source_authority: SourceAuthority = "unknown"
    collector: CollectorName
    language: str | None = None
    region: str | None = None
    enabled: bool = True
    notes: str | None = None
    crawl_limit: int = 80
    max_depth: int = 1
    allowed_page_domains: list[str] = Field(default_factory=list)
    allowed_pdf_domains: list[str] = Field(default_factory=list)
    url_include_patterns: list[str] = Field(default_factory=list)
    url_exclude_patterns: list[str] = Field(default_factory=list)
    pdf_url_include_patterns: list[str] = Field(default_factory=list)
    pdf_url_exclude_patterns: list[str] = Field(default_factory=list)


class ManualSource(BaseModel):
    source_id: str = Field(
        description="Stable ID generated from source_name + pdf_url."
    )

    brand: str
    model_family: str | None = None
    model_names: list[str] = Field(default_factory=list)
    document_type: str | None = None

    language: str | None = None
    region: str | None = None

    source_authority: SourceAuthority = "unknown"
    source_name: str
    source_page_url: str
    pdf_url: str

    discovered_at: str = Field(default_factory=utc_now_iso)

    file_name: str | None = None
    is_likely_manual: bool = True

    download_status: DownloadStatus = "pending"
    local_path: str | None = None
    file_hash: str | None = None
    downloaded_at: str | None = None

    notes: str | None = None


class DownloadedManualRecord(BaseModel):
    source_id: str
    brand: str
    source_name: str
    source_authority: SourceAuthority
    source_page_url: str
    pdf_url: str
    local_path: str
    file_hash: str
    downloaded_at: str
    language: str | None = None
    region: str | None = None
    model_family: str | None = None
    document_type: str | None = None


class FailedDownloadRecord(BaseModel):
    source_id: str | None = None
    brand: str | None = None
    source_name: str | None = None
    pdf_url: str | None = None
    error: str
    failed_at: str = Field(default_factory=utc_now_iso)