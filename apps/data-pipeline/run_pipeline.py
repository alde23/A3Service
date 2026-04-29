from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from json import JSONDecodeError
from json_repair import repair_json

from pydantic import ValidationError
from src.schemas import BoilerManualData

from src.api_extractor import extract_boiler_data_from_pdf


BASE_DIR = Path(__file__).resolve().parent
RAW_PDF_DIR = BASE_DIR / "raw_pdfs"
OUTPUT_JSON_DIR = BASE_DIR / "output_json"
PROMPT_PATH = BASE_DIR / "prompts" / "extract_manual_data.txt"

INDEX_DIR = OUTPUT_JSON_DIR / "_index"
REVIEW_DIR = OUTPUT_JSON_DIR / "_review"

PROCESSED_MANUALS_PATH = INDEX_DIR / "processed_manuals.json"
FAULT_CODES_INDEX_PATH = INDEX_DIR / "fault_codes_index.json"
MANUALS_INDEX_PATH = INDEX_DIR / "manuals_index.json"

LOW_CONFIDENCE_PATH = REVIEW_DIR / "low_confidence_records.json"
FAILED_EXTRACTIONS_PATH = REVIEW_DIR / "failed_extractions.json"
DEBUG_DIR = OUTPUT_JSON_DIR / "_debug"

LOW_CONFIDENCE_THRESHOLD = 0.75


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_directories() -> None:
    RAW_PDF_DIR.mkdir(exist_ok=True)
    OUTPUT_JSON_DIR.mkdir(exist_ok=True)
    INDEX_DIR.mkdir(exist_ok=True)
    REVIEW_DIR.mkdir(exist_ok=True)
    DEBUG_DIR.mkdir(exist_ok=True)


def load_json_file(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"⚠️ Could not parse existing JSON file: {path}")
        return fallback


def write_json_file(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def compute_file_hash(path: Path) -> str:
    sha256 = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            sha256.update(chunk)

    return sha256.hexdigest()


def slugify(value: str | None, fallback: str = "unknown") -> str:
    if not value:
        value = fallback

    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")

    return value or fallback


def find_pdf_files() -> list[Path]:
    return sorted(RAW_PDF_DIR.rglob("*.pdf"))


def short_hash(file_hash: str) -> str:
    return file_hash[:10]


def build_output_path(extracted_data: dict[str, Any], pdf_path: Path, file_hash: str) -> Path:
    document_meta = extracted_data.get("document_meta", {})

    brand_name = document_meta.get("brand_name") or "Unknown"
    product_family = document_meta.get("product_family")
    model_names = document_meta.get("model_names") or []

    model_or_family = product_family or (model_names[0] if model_names else pdf_path.stem)

    brand_folder = OUTPUT_JSON_DIR / slugify(brand_name, fallback="unknown_brand").title()

    filename = (
        f"{slugify(brand_name)}_"
        f"{slugify(model_or_family, fallback=pdf_path.stem)}_"
        f"{short_hash(file_hash)}.json"
    )

    return brand_folder / filename


def inject_pipeline_metadata(
    extracted_data: dict[str, Any],
    pdf_path: Path,
    file_hash: str,
) -> dict[str, Any]:
    extracted_data.setdefault("document_meta", {})
    extracted_data["document_meta"]["source_file"] = pdf_path.name
    extracted_data["document_meta"]["file_hash"] = file_hash

    return extracted_data


def collect_low_confidence_records(
    extracted_data: dict[str, Any],
    output_file: Path,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    sections = [
        "technical_specs",
        "fault_codes",
        "diagnostic_codes",
        "status_codes",
        "safety_warnings",
        "maintenance_tasks",
    ]

    for section in sections:
        items = extracted_data.get(section, [])

        if not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue

            confidence = item.get("confidence")
            review_required = item.get("review_required", False)

            is_low_confidence = (
                isinstance(confidence, int | float)
                and confidence < LOW_CONFIDENCE_THRESHOLD
            )

            if review_required or is_low_confidence:
                records.append(
                    {
                        "section": section,
                        "output_file": str(output_file.relative_to(OUTPUT_JSON_DIR)),
                        "confidence": confidence,
                        "review_required": review_required,
                        "record": item,
                    }
                )

    extraction_meta = extracted_data.get("extraction_meta", {})
    if extraction_meta.get("review_required"):
        records.append(
            {
                "section": "extraction_meta",
                "output_file": str(output_file.relative_to(OUTPUT_JSON_DIR)),
                "confidence": extraction_meta.get("overall_confidence"),
                "review_required": True,
                "record": extraction_meta,
            }
        )

    return records


def build_manual_index_record(
    extracted_data: dict[str, Any],
    pdf_path: Path,
    output_file: Path,
    file_hash: str,
) -> dict[str, Any]:
    document_meta = extracted_data.get("document_meta", {})
    extraction_meta = extracted_data.get("extraction_meta", {})

    return {
        "source_file": pdf_path.name,
        "file_hash": file_hash,
        "output_file": str(output_file.relative_to(OUTPUT_JSON_DIR)),
        "brand_name": document_meta.get("brand_name"),
        "product_family": document_meta.get("product_family"),
        "model_names": document_meta.get("model_names", []),
        "manual_type": document_meta.get("manual_type"),
        "language": document_meta.get("language"),
        "region": document_meta.get("region"),
        "overall_confidence": extraction_meta.get("overall_confidence"),
        "review_required": extraction_meta.get("review_required"),
        "processed_at": utc_now_iso(),
    }


def build_fault_index_records(
    extracted_data: dict[str, Any],
    output_file: Path,
) -> list[dict[str, Any]]:
    document_meta = extracted_data.get("document_meta", {})
    fault_codes = extracted_data.get("fault_codes", [])

    records: list[dict[str, Any]] = []

    if not isinstance(fault_codes, list):
        return records

    for fault in fault_codes:
        if not isinstance(fault, dict):
            continue

        records.append(
            {
                "code": fault.get("code"),
                "description": fault.get("description"),
                "brand_name": document_meta.get("brand_name"),
                "product_family": document_meta.get("product_family"),
                "model_names": document_meta.get("model_names", []),
                "search_tags": fault.get("search_tags", []),
                "related_components": fault.get("related_components", []),
                "output_file": str(output_file.relative_to(OUTPUT_JSON_DIR)),
                "confidence": fault.get("confidence"),
                "review_required": fault.get("review_required"),
            }
        )

    return records


def parse_extractor_response(json_string: str, pdf_path: Path) -> dict[str, Any]:
    """
    Parse Gemini JSON output.

    LLMs sometimes return malformed JSON even when response_mime_type is set.
    We first save the raw response for debugging, then try strict JSON parsing.
    If strict parsing fails, we attempt JSON repair and mark the result for review.
    """

    debug_stem = slugify(pdf_path.stem)
    raw_debug_path = DEBUG_DIR / f"{debug_stem}.raw_response.json"
    repaired_debug_path = DEBUG_DIR / f"{debug_stem}.repaired_response.json"

    raw_debug_path.write_text(json_string, encoding="utf-8")

    try:
        return json.loads(json_string)

    except JSONDecodeError as error:
        print(
            f"⚠️ Gemini returned malformed JSON for {pdf_path.name}. "
            f"Attempting repair. Original error: line {error.lineno}, "
            f"column {error.colno}"
        )

        repaired_json = repair_json(json_string)
        repaired_debug_path.write_text(repaired_json, encoding="utf-8")

        extracted_data = json.loads(repaired_json)

        extracted_data.setdefault("extraction_meta", {})
        extracted_data["extraction_meta"]["review_required"] = True

        notes = extracted_data["extraction_meta"].setdefault("extraction_notes", [])
        notes.append(
            "Original Gemini response was malformed JSON and was repaired by the pipeline."
        )

        return extracted_data

#helper functions

def add_extraction_note(extracted_data: dict[str, Any], note: str) -> None:
    extracted_data.setdefault("extraction_meta", {})
    notes = extracted_data["extraction_meta"].setdefault("extraction_notes", [])

    if note not in notes:
        notes.append(note)


def ensure_extraction_meta(extracted_data: dict[str, Any]) -> None:
    extracted_data.setdefault("extraction_meta", {})
    meta = extracted_data["extraction_meta"]

    if not isinstance(meta.get("overall_confidence"), int | float):
        meta["overall_confidence"] = 0.0
        meta["review_required"] = True
        add_extraction_note(
            extracted_data,
            "overall_confidence was missing or invalid and was set to 0.0 by the pipeline.",
        )

    meta.setdefault("review_required", True)
    meta.setdefault("missing_or_unclear_sections", [])
    meta.setdefault("extraction_notes", [])


def ensure_top_level_defaults(extracted_data: dict[str, Any]) -> None:
    extracted_data.setdefault("schema_version", "0.2.0")
    extracted_data.setdefault("document_meta", {})
    extracted_data.setdefault("technical_specs", [])
    extracted_data.setdefault("fault_codes", [])
    extracted_data.setdefault("diagnostic_codes", [])
    extracted_data.setdefault("status_codes", [])
    extracted_data.setdefault("safety_warnings", [])
    extracted_data.setdefault("maintenance_tasks", [])
    extracted_data.setdefault("search_terms", [])

    extracted_data.setdefault(
        "derived_guidance",
        {
            "status": "not_generated",
            "technician_summary": None,
            "steps": [],
            "generated_from": [],
            "review_status": "not_reviewed",
        },
    )

    ensure_extraction_meta(extracted_data)


def normalize_technical_specs(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("technical_specs", []):
        if not isinstance(item, dict):
            continue

        if not item.get("parameter") or not item.get("value"):
            add_extraction_note(
                extracted_data,
                "A technical_specs item was dropped because it was missing parameter or value.",
            )
            continue

        item.setdefault("unit", None)
        item.setdefault("applies_to_models", [])
        item.setdefault("category", None)
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["technical_specs"] = normalized_items


def normalize_fault_codes(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("fault_codes", []):
        if not isinstance(item, dict):
            continue

        if not item.get("code") or not item.get("description"):
            add_extraction_note(
                extracted_data,
                "A fault_codes item was dropped because it was missing code or description.",
            )
            continue

        item.setdefault("possible_causes", [])
        item.setdefault("manufacturer_steps", [])
        item.setdefault("cautions_or_notes", [])
        item.setdefault("symptoms", [])
        item.setdefault("related_components", [])
        item.setdefault("severity", "unknown")
        item.setdefault("safety_level", "unknown")
        item.setdefault("search_tags", [])
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["fault_codes"] = normalized_items


def normalize_diagnostic_codes(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("diagnostic_codes", []):
        if not isinstance(item, dict):
            continue

        if not item.get("code") or not item.get("description"):
            add_extraction_note(
                extracted_data,
                "A diagnostic_codes item was dropped because it was missing code or description.",
            )
            continue

        item.setdefault("value_range", None)
        item.setdefault("default_value", None)
        item.setdefault("unit", None)
        item.setdefault("adjustable", None)
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["diagnostic_codes"] = normalized_items


def normalize_status_codes(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("status_codes", []):
        if not isinstance(item, dict):
            continue

        if not item.get("code") or not item.get("meaning"):
            add_extraction_note(
                extracted_data,
                "A status_codes item was dropped because it was missing code or meaning.",
            )
            continue

        item.setdefault("operating_mode", None)
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["status_codes"] = normalized_items


def normalize_safety_warnings(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("safety_warnings", []):
        if not isinstance(item, dict):
            continue

        if not item.get("topic") or not item.get("text"):
            add_extraction_note(
                extracted_data,
                "A safety_warnings item was dropped because it was missing topic or text.",
            )
            continue

        item.setdefault("warning_type", "unknown")
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["safety_warnings"] = normalized_items


def normalize_maintenance_tasks(extracted_data: dict[str, Any]) -> None:
    normalized_items: list[dict[str, Any]] = []

    for item in extracted_data.get("maintenance_tasks", []):
        if not isinstance(item, dict):
            continue

        if not item.get("task_name"):
            add_extraction_note(
                extracted_data,
                "A maintenance_tasks item was dropped because it was missing task_name.",
            )
            continue

        item.setdefault("description", None)
        item.setdefault("interval", None)
        item.setdefault("required_qualification", None)
        item.setdefault("source_refs", [])

        if not isinstance(item.get("confidence"), int | float):
            item["confidence"] = 0.0
            item["review_required"] = True

        item.setdefault("review_required", True)

        normalized_items.append(item)

    extracted_data["maintenance_tasks"] = normalized_items


def apply_quality_gates(extracted_data: dict[str, Any]) -> None:
    fault_count = len(extracted_data.get("fault_codes", []))
    diagnostic_count = len(extracted_data.get("diagnostic_codes", []))
    status_count = len(extracted_data.get("status_codes", []))

    if fault_count == 0 and diagnostic_count == 0 and status_count == 0:
        extracted_data["extraction_meta"]["review_required"] = True
        extracted_data["extraction_meta"]["overall_confidence"] = min(
            extracted_data["extraction_meta"].get("overall_confidence", 0.0),
            0.4,
        )
        add_extraction_note(
            extracted_data,
            "No fault codes, diagnostic codes, or status codes were extracted. Manual should be reviewed or reprocessed.",
        )

    if fault_count == 0:
        extracted_data["extraction_meta"]["review_required"] = True
        add_extraction_note(
            extracted_data,
            "No fault_codes were extracted.",
        )


def normalize_and_validate_extracted_data(
    extracted_data: dict[str, Any],
    pdf_path: Path,
) -> dict[str, Any]:
    ensure_top_level_defaults(extracted_data)

    normalize_technical_specs(extracted_data)
    normalize_fault_codes(extracted_data)
    normalize_diagnostic_codes(extracted_data)
    normalize_status_codes(extracted_data)
    normalize_safety_warnings(extracted_data)
    normalize_maintenance_tasks(extracted_data)

    apply_quality_gates(extracted_data)

    try:
        validated = BoilerManualData.model_validate(extracted_data)
        return validated.model_dump(mode="json")

    except ValidationError as error:
        validation_debug_path = DEBUG_DIR / f"{slugify(pdf_path.stem)}.validation_error.txt"
        validation_debug_path.write_text(str(error), encoding="utf-8")

        raise ValueError(
            f"Extracted data did not pass schema validation. "
            f"Validation details saved to: {validation_debug_path.relative_to(BASE_DIR)}"
        ) from error

def process_pdf(
    pdf_path: Path,
    processed_manifest: dict[str, Any],
    force: bool,
) -> tuple[bool, dict[str, Any] | None]:
    file_hash = compute_file_hash(pdf_path)

    if not force and file_hash in processed_manifest:
        previous = processed_manifest[file_hash]
        previous_output = OUTPUT_JSON_DIR / previous.get("output_file", "")

        if previous_output.exists():
            print(f"⏭️ Skipping already processed manual: {pdf_path.name}")
            return False, previous

    print(f"\n📄 Processing manual: {pdf_path.name}")

    json_string = extract_boiler_data_from_pdf(pdf_path, PROMPT_PATH)
    extracted_data = parse_extractor_response(json_string, pdf_path)

    extracted_data = inject_pipeline_metadata(
        extracted_data=extracted_data,
        pdf_path=pdf_path,
        file_hash=file_hash,
    )
    # Normalize, validate, and apply quality gates to the extracted data.
    extracted_data = normalize_and_validate_extracted_data(
        extracted_data=extracted_data,
        pdf_path=pdf_path,
    )


    output_file = build_output_path(
        extracted_data=extracted_data,
        pdf_path=pdf_path,
        file_hash=file_hash,
    )

    write_json_file(output_file, extracted_data)

    manifest_record = build_manual_index_record(
        extracted_data=extracted_data,
        pdf_path=pdf_path,
        output_file=output_file,
        file_hash=file_hash,
    )

    processed_manifest[file_hash] = manifest_record

    print(f"✅ Saved: {output_file.relative_to(BASE_DIR)}")

    return True, manifest_record


def main() -> None:
    parser = argparse.ArgumentParser(description="A3Service PDF manual extraction pipeline")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reprocess PDFs even if their hash already exists in the manifest.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum number of PDFs to process in this run.",
    )

    args = parser.parse_args()

    print("🚀 Starting A3Service manual extraction pipeline...")

    ensure_directories()

    if not PROMPT_PATH.exists():
        print(f"❌ Prompt file not found: {PROMPT_PATH.relative_to(BASE_DIR)}")
        return

    pdf_files = find_pdf_files()

    if args.limit is not None:
        pdf_files = pdf_files[: args.limit]

    if not pdf_files:
        print(f"⚠️ No PDF files found in {RAW_PDF_DIR.relative_to(BASE_DIR)}")
        return

    processed_manifest = load_json_file(PROCESSED_MANUALS_PATH, fallback={})
    all_low_confidence_records = load_json_file(LOW_CONFIDENCE_PATH, fallback=[])
    failed_extractions = load_json_file(FAILED_EXTRACTIONS_PATH, fallback=[])
    manuals_index = load_json_file(MANUALS_INDEX_PATH, fallback=[])
    fault_codes_index = load_json_file(FAULT_CODES_INDEX_PATH, fallback=[])

    successful_count = 0
    skipped_count = 0
    failed_count = 0

    for pdf_path in pdf_files:
        try:
            did_process, manifest_record = process_pdf(
                pdf_path=pdf_path,
                processed_manifest=processed_manifest,
                force=args.force,
            )

            if not did_process:
                skipped_count += 1
                continue

            successful_count += 1

            if manifest_record is None:
                continue

            failed_extractions = [
                item for item in failed_extractions
                if item.get("source_file") != manifest_record["source_file"]
            ]

            output_file = OUTPUT_JSON_DIR / manifest_record["output_file"]
            extracted_data = load_json_file(output_file, fallback={})

            manuals_index = [
                item for item in manuals_index
                if item.get("file_hash") != manifest_record["file_hash"]
            ]
            manuals_index.append(manifest_record)

            fault_codes_index = [
                item for item in fault_codes_index
                if item.get("output_file") != manifest_record["output_file"]
            ]
            fault_codes_index.extend(
                build_fault_index_records(
                    extracted_data=extracted_data,
                    output_file=output_file,
                )
            )

            all_low_confidence_records = [
                item for item in all_low_confidence_records
                if item.get("output_file") != manifest_record["output_file"]
            ]
            all_low_confidence_records.extend(
                collect_low_confidence_records(
                    extracted_data=extracted_data,
                    output_file=output_file,
                )
            )

        except Exception as error:
            failed_count += 1
            print(f"❌ Failed to process {pdf_path.name}: {error}")

            failed_extractions.append(
                {
                    "source_file": pdf_path.name,
                    "error": str(error),
                    "failed_at": utc_now_iso(),
                }
            )

    write_json_file(PROCESSED_MANUALS_PATH, processed_manifest)
    write_json_file(MANUALS_INDEX_PATH, manuals_index)
    write_json_file(FAULT_CODES_INDEX_PATH, fault_codes_index)
    write_json_file(LOW_CONFIDENCE_PATH, all_low_confidence_records)
    write_json_file(FAILED_EXTRACTIONS_PATH, failed_extractions)

    print("\n📊 Pipeline summary")
    print(f"✅ Processed: {successful_count}")
    print(f"⏭️ Skipped: {skipped_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"📁 Output folder: {OUTPUT_JSON_DIR.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()