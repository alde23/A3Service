from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.parse import urlparse

from src.manual_source_schema import ManualSource, SourceRegistryEntry


def _source_id(source_name: str, pdf_url: str) -> str:
    value = f"{source_name}|{pdf_url}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:16]


def _filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    filename = Path(parsed.path).name

    if filename.lower().endswith(".pdf"):
        return filename

    return "manual.pdf"


def collect_direct_pdf_source(entry: SourceRegistryEntry) -> list[ManualSource]:
    """
    Collector for registry entries where source_url is already a direct PDF URL.
    """

    return [
        ManualSource(
            source_id=_source_id(entry.source_name, entry.source_url),
            brand=entry.brand,
            model_family=None,
            model_names=[],
            document_type="manual",
            language=entry.language,
            region=entry.region,
            source_authority=entry.source_authority,
            source_name=entry.source_name,
            source_page_url=entry.source_url,
            pdf_url=entry.source_url,
            file_name=_filename_from_url(entry.source_url),
            is_likely_manual=True,
            notes=entry.notes,
        )
    ]