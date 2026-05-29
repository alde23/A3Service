from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from pydantic import ValidationError

from src.manual_source_schema import (
    DownloadedManualRecord,
    FailedDownloadRecord,
    ManualSource,
    SourceRegistryEntry,
    utc_now_iso,
)
from src.source_collectors import get_collector


BASE_DIR = Path(__file__).resolve().parents[1]

INPUT_DIR = BASE_DIR / "input"
RAW_PDF_DIR = BASE_DIR / "raw_pdfs"
OUTPUT_JSON_DIR = BASE_DIR / "output_json"
INDEX_DIR = OUTPUT_JSON_DIR / "_index"
REVIEW_DIR = OUTPUT_JSON_DIR / "_review"

SOURCE_REGISTRY_PATH = INPUT_DIR / "source_registry.json"
SOURCE_REGISTRY_EXAMPLE_PATH = INPUT_DIR / "source_registry.example.json"
MANUAL_SOURCES_PATH = INPUT_DIR / "manual_sources.generated.json"

DOWNLOADED_MANUALS_PATH = INDEX_DIR / "downloaded_manuals.json"
FAILED_DOWNLOADS_PATH = REVIEW_DIR / "failed_downloads.json"

REQUEST_TIMEOUT_SECONDS = 60
CHUNK_SIZE = 1024 * 1024


DEFAULT_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    ),
    "Accept": "application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def ensure_downloader_directories() -> None:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_PDF_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"⚠️ Could not parse JSON file: {path}")
        return fallback


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def slugify(value: str | None, fallback: str = "unknown") -> str:
    if not value:
        value = fallback

    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")

    return value or fallback


def compute_file_hash(path: Path) -> str:
    sha256 = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(CHUNK_SIZE), b""):
            sha256.update(chunk)

    return sha256.hexdigest()


def load_source_registry() -> list[SourceRegistryEntry]:
    registry_path = SOURCE_REGISTRY_PATH

    if not registry_path.exists():
        registry_path = SOURCE_REGISTRY_EXAMPLE_PATH

    raw_items = read_json(registry_path, fallback=[])

    registry: list[SourceRegistryEntry] = []

    for item in raw_items:
        try:
            registry.append(SourceRegistryEntry.model_validate(item))
        except ValidationError as error:
            print(f"⚠️ Invalid source registry entry skipped: {error}")

    return registry


def load_manual_sources() -> list[ManualSource]:
    raw_items = read_json(MANUAL_SOURCES_PATH, fallback=[])

    sources: list[ManualSource] = []

    for item in raw_items:
        try:
            sources.append(ManualSource.model_validate(item))
        except ValidationError as error:
            print(f"⚠️ Invalid manual source skipped: {error}")

    return sources


def save_manual_sources(sources: list[ManualSource]) -> None:
    write_json(
        MANUAL_SOURCES_PATH,
        [source.model_dump(mode="json") for source in sources],
    )


def merge_manual_sources(
    existing_sources: list[ManualSource],
    discovered_sources: list[ManualSource],
) -> list[ManualSource]:
    by_source_id: dict[str, ManualSource] = {
        source.source_id: source for source in existing_sources
    }

    for discovered in discovered_sources:
        existing = by_source_id.get(discovered.source_id)

        if existing is None:
            by_source_id[discovered.source_id] = discovered
            continue

        # Preserve download status/local path/hash from previous runs,
        # but refresh discovery metadata.
        discovered.download_status = existing.download_status
        discovered.local_path = existing.local_path
        discovered.file_hash = existing.file_hash
        discovered.downloaded_at = existing.downloaded_at

        by_source_id[discovered.source_id] = discovered

    return sorted(
        by_source_id.values(),
        key=lambda item: (item.brand.lower(), item.source_name.lower(), item.pdf_url),
    )


def discover_manual_sources(
    brand: str | None = None,
    collector_name: str | None = None,
    limit: int | None = None,
) -> list[ManualSource]:
    ensure_downloader_directories()

    registry = load_source_registry()

    discovered_sources: list[ManualSource] = []

    for entry in registry:
        if not entry.enabled:
            continue

        if brand and entry.brand.lower() != brand.lower():
            continue

        if collector_name and entry.collector != collector_name:
            continue

        print(f"🔎 Discovering sources: {entry.brand} / {entry.source_name}")

        try:
            collector = get_collector(entry.collector)
            collected = collector(entry)
            print(f"✅ Found {len(collected)} PDF source(s).")

            discovered_sources.extend(collected)

        except Exception as error:
            print(f"❌ Source discovery failed for {entry.source_name}: {error}")

    if limit is not None:
        discovered_sources = discovered_sources[:limit]

    existing_sources = load_manual_sources()
    merged_sources = merge_manual_sources(existing_sources, discovered_sources)

    save_manual_sources(merged_sources)

    print(f"📄 Saved source list: {MANUAL_SOURCES_PATH.relative_to(BASE_DIR)}")
    print(f"📊 Total known manual sources: {len(merged_sources)}")

    return merged_sources


def _filename_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    filename = Path(parsed.path).name

    if filename.lower().endswith(".pdf"):
        return filename

    return None


def build_local_pdf_path(source: ManualSource) -> Path:
    brand_folder = RAW_PDF_DIR / source.brand

    source_file_name = (
        source.file_name
        or _filename_from_url(source.pdf_url)
        or f"{slugify(source.model_family, fallback='manual')}.pdf"
    )

    stem = Path(source_file_name).stem
    suffix = Path(source_file_name).suffix or ".pdf"

    brand_slug = slugify(source.brand)
    model_slug = slugify(source.model_family, fallback="manual")
    document_slug = slugify(source.document_type, fallback="document")

    safe_name = f"{brand_slug}_{model_slug}_{document_slug}_{slugify(stem)}{suffix}"

    # Avoid extremely long Windows paths.
    if len(safe_name) > 180:
        safe_name = f"{brand_slug}_{model_slug}_{source.source_id}{suffix}"

    return brand_folder / safe_name


def load_downloaded_records() -> list[DownloadedManualRecord]:
    raw_items = read_json(DOWNLOADED_MANUALS_PATH, fallback=[])

    records: list[DownloadedManualRecord] = []

    for item in raw_items:
        try:
            records.append(DownloadedManualRecord.model_validate(item))
        except ValidationError:
            continue

    return records


def save_downloaded_records(records: list[DownloadedManualRecord]) -> None:
    write_json(
        DOWNLOADED_MANUALS_PATH,
        [record.model_dump(mode="json") for record in records],
    )


def load_failed_downloads() -> list[FailedDownloadRecord]:
    raw_items = read_json(FAILED_DOWNLOADS_PATH, fallback=[])

    records: list[FailedDownloadRecord] = []

    for item in raw_items:
        try:
            records.append(FailedDownloadRecord.model_validate(item))
        except ValidationError:
            continue

    return records


def save_failed_downloads(records: list[FailedDownloadRecord]) -> None:
    write_json(
        FAILED_DOWNLOADS_PATH,
        [record.model_dump(mode="json") for record in records],
    )


def download_pdf(source: ManualSource, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)

    session = requests.Session()

    headers = {
        **DEFAULT_REQUEST_HEADERS,
        "Referer": source.source_page_url,
    }

    # Some sites block direct PDF access unless the session first visits
    # the source page and receives cookies.
    try:
        session.get(
            source.source_page_url,
            headers=DEFAULT_REQUEST_HEADERS,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except Exception as error:
        print(
            f"⚠️ Could not pre-visit source page before download: "
            f"{source.source_page_url}. Continuing anyway. Error: {error}"
        )

    with session.get(
        source.pdf_url,
        stream=True,
        timeout=REQUEST_TIMEOUT_SECONDS,
        headers=headers,
        allow_redirects=True,
    ) as response:
        response.raise_for_status()

        content_type = response.headers.get("content-type", "").lower()

        if "pdf" not in content_type and not source.pdf_url.lower().endswith(".pdf"):
            print(
                f"⚠️ Content-Type is not clearly PDF for {source.pdf_url}: "
                f"{content_type or 'missing'}"
            )

        with destination.open("wb") as file:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if chunk:
                    file.write(chunk)

    return compute_file_hash(destination)



def manual_relevance_score(source: ManualSource) -> int:
    """
    Higher score means the PDF is more likely to be useful for the A3Service
    technical library extraction pipeline.

    Current priority:
    1. boiler/furnace/water-heater installation/service manuals
    2. troubleshooting/error-code documents
    3. technical manuals/specifications
    4. avoid brochures, controllers, accessories, duplicated non-English files
    """

    combined = " ".join(
        [
            source.brand or "",
            source.source_name or "",
            source.model_family or "",
            source.document_type or "",
            source.file_name or "",
            source.pdf_url or "",
            source.notes or "",
        ]
    ).lower()

    score = 0

    # Very useful for A3Service
    core_product_terms = [
        "boiler",
        "furnace",
        "water heater",
        "condensing",
        "combi",
        "greenstar",
        "singular",
        "gb142",
        "gb162",
        "bgh",
        "ssb",
        # Generic terms that are common in Viessmann manuals, but not definitive alone.
        "viessmann",
        "vitodens",
        "vitocrossal",
        "vitorond",
        "vitola",
        "vitocal",
        "vitosol",
        "vitotronic",
    ]

    # Documents we want most
    high_value_document_terms = [
        "installation and service",
        "installation_and_service",
        "installation service",
        "service manual",
        "service_manual",
        "installation manual",
        "installation_manual",
        "operation and maintenance",
        "maintenance manual",
        "troubleshooting",
        "fault",
        "error code",
        "manuale",
        "installazione",
        "istruzioni",
        "manutenzione",
        "tecnico",
        "installation/service",
        "installation operating service",
        "installation/operating/service",
        "start-up/service",
        "startup/service",
        "technical data manual",
    ]

    # Useful but not enough alone
    medium_value_terms = [
        "manual",
        "instructions",
        "operating",
        "technical",
        "specification",
    ]

    # Lower priority / noise for current stage
    low_value_or_noise_terms = [
    "brochure",
    "flyer",
    "catalog",
    "warranty",
    "rebate",
    "accessory",
    "kit",
    "conversion",
    "application manual",
    "applications manual",
    "panel radiator",
    "radiator",
    "parts list",
    "controller",
    "control room",
    "thermostat",
    "crc",
    "remote control",
    "manifold",
    "accessory instructions",
    "kit instructions",
    "replacement instructions",
    "conversion instructions",
    #
    "wiring diagram",
    "wiring diagrams",
    "combustion chamber dimensions",
    "quick reference",
    ]

    # Non-English duplicates should not be selected before English.
    non_english_markers = [
        "_fr_",
        "-fr-",
        "_fr.",
        "/fr/",
        " french",
        " en-fr",
        "_es_",
        "-es-",
        "_es.",
        "/es/",
        " spanish",
    ]

    for term in core_product_terms:
        if term in combined:
            score += 12

    for term in high_value_document_terms:
        if term in combined:
            score += 10

    for term in medium_value_terms:
        if term in combined:
            score += 3

    for term in low_value_or_noise_terms:
        if term in combined:
            score -= 12

    for marker in non_english_markers:
        if marker in combined:
            score -= 20

    # Prefer explicitly English PDFs.
    english_markers = [
        "_en_",
        "-en-",
        "_en.",
        "/en/",
        " english",
    ]

    for marker in english_markers:
        if marker in combined:
            score += 8


        # Unical official pages often expose PDFs through generic attachment buttons.
    # The page context can be weak, so official Unical PDF links need a small boost.
    if source.brand.lower() == "unical" and source.source_authority == "official":
        score += 15

    if "upload/blocchi" in combined:
        score += 5

    if "section=installation manual" in combined or "section=installation manuals" in combined:
        score += 15

    if "section=user manual" in combined or "section=user manuals" in combined:
        score += 10

    if "section=technical information" in combined or "section=technical informations" in combined:
        score += 5

    if "section=certification" in combined or "section=certifications" in combined:
        score -= 25

    if "section=brochure" in combined or "section=brochures" in combined:
        score -= 25

    if source.source_authority == "official":
        score += 3

    if not source.is_likely_manual:
        if source.brand.lower() == "unical" and source.source_authority == "official":
            score -= 5
        else:
            score -= 20
    return score


def minimum_relevance_score(source: ManualSource) -> int:
    """
    Some official manufacturer sites expose weak metadata around PDF links.
    Use a lower threshold for those sources while keeping stricter filtering
    for broader pages like Bosch.
    """

    if source.brand.lower() == "unical" and source.source_authority == "official":
        return 0

    return 20

def download_manual_sources(
    brand: str | None = None,
    limit: int | None = None,
    download_all: bool = False,
) -> list[DownloadedManualRecord]:
    ensure_downloader_directories()

    sources = load_manual_sources()

    if brand:
        sources = [
            source for source in sources
            if source.brand.lower() == brand.lower()
        ]

    sources_to_download = []

    for source in sources:
        if source.download_status == "downloaded" and source.local_path:
            continue

        # Do not skip weakly classified records here.
        # Some official manufacturer pages, especially Unical, expose PDF links
        # through generic "Download attachment" buttons, so is_likely_manual may be false.
        # Relevance filtering happens later using manual_relevance_score().
        sources_to_download.append(source)


    sources_to_download = sorted(
        sources_to_download,
        key=manual_relevance_score,
        reverse=True,
    )

    print("🔍 Top candidate scores before filtering:")
    for source in sources_to_download[:10]:
        print(
            f"   score={manual_relevance_score(source):>3} | "
            f"min={minimum_relevance_score(source):>2} | "
            f"{source.brand} | {source.model_family} | "
            f"{source.document_type} | {source.file_name}"
        )

    if not download_all:
        sources_to_download = [
            source for source in sources_to_download
            if manual_relevance_score(source) >= minimum_relevance_score(source)
        ]

    if limit is not None:
        sources_to_download = sources_to_download[:limit]

    downloaded_records = load_downloaded_records()
    failed_downloads = load_failed_downloads()

    downloaded_by_source_id = {
        record.source_id: record for record in downloaded_records
    }

    print(f"📥 Manuals selected for download: {len(sources_to_download)}")

    for source in sources_to_download[:10]:
        print(
            f"   score={manual_relevance_score(source):>3} | "
            f"{source.brand} | {source.model_family} | "
            f"{source.document_type} | {source.file_name}"
        )

    for source in sources_to_download:
        destination = build_local_pdf_path(source)

        try:
            if destination.exists():
                file_hash = compute_file_hash(destination)
                print(f"⏭️ Already exists locally: {destination.relative_to(BASE_DIR)}")
            else:
                print(f"⬇️ Downloading: {source.brand} / {source.pdf_url}")
                file_hash = download_pdf(source, destination)

            source.download_status = "downloaded"
            source.local_path = str(destination.relative_to(BASE_DIR))
            source.file_hash = file_hash
            source.downloaded_at = utc_now_iso()

            downloaded_by_source_id[source.source_id] = DownloadedManualRecord(
                source_id=source.source_id,
                brand=source.brand,
                source_name=source.source_name,
                source_authority=source.source_authority,
                source_page_url=source.source_page_url,
                pdf_url=source.pdf_url,
                local_path=source.local_path,
                file_hash=file_hash,
                downloaded_at=source.downloaded_at,
                language=source.language,
                region=source.region,
                model_family=source.model_family,
                document_type=source.document_type,
            )

            # Clear old failures for this source after success.
            failed_downloads = [
                item for item in failed_downloads
                if item.source_id != source.source_id
            ]

            print(f"✅ Saved: {destination.relative_to(BASE_DIR)}")

        except Exception as error:
            source.download_status = "failed"

            failed_downloads.append(
                FailedDownloadRecord(
                    source_id=source.source_id,
                    brand=source.brand,
                    source_name=source.source_name,
                    pdf_url=source.pdf_url,
                    error=str(error),
                )
            )

            print(f"❌ Failed download: {source.pdf_url}")
            print(f"   Error: {error}")

    # Persist updated statuses.
    all_sources = load_manual_sources()
    by_source_id = {source.source_id: source for source in all_sources}

    for updated_source in sources:
        by_source_id[updated_source.source_id] = updated_source

    save_manual_sources(
        sorted(
            by_source_id.values(),
            key=lambda item: (item.brand.lower(), item.source_name.lower(), item.pdf_url),
        )
    )

    final_downloaded_records = sorted(
        downloaded_by_source_id.values(),
        key=lambda item: (item.brand.lower(), item.local_path),
    )

    save_downloaded_records(final_downloaded_records)
    save_failed_downloads(failed_downloads)

    print(f"📄 Download manifest: {DOWNLOADED_MANUALS_PATH.relative_to(BASE_DIR)}")
    print(f"⚠️ Failed downloads: {FAILED_DOWNLOADS_PATH.relative_to(BASE_DIR)}")

    return final_downloaded_records