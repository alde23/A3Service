# A3Service Data Pipeline

## Purpose

The A3Service data pipeline prepares boiler/manual PDF documents for the technical library used by the backend and mobile app.

The workflow is intentionally split into two separate parts:

```text
1. Manual PDF discovery/download
2. Structured JSON extraction from downloaded PDFs
```

The downloader does not call Gemini.

The extraction pipeline does not scrape websites.

This separation makes the workflow easier to debug, rerun, and validate.

## Main folders

```text
apps/data-pipeline/
  input/
    source_registry.example.json
    source_registry.json                 local optional file
    manual_sources.generated.json        generated local file

  prompts/
    extract_manual_data.txt

  raw_pdfs/
    Bosch/
    Vaillant/
    Baxi/
    Unical/
    Viessmann/
    Buderus/ -not intended, but related to bosch.

  src/
    api_extractor.py
    downloader.py
    manual_source_schema.py
    schemas.py
    source_collectors/

  output_json/
    Bosch/
    Vaillant/
    Baxi/
    Unical/
    Viessmann/
    Buderus/
    _index/
    _review/
    _debug/

  download_manuals.py
  run_pipeline.py
```

## Local-only files

The following files and folders are local/generated and should normally not be committed:

```text
.env
.venv/
raw_pdfs/
logs/
input/manual_sources.generated.json
output_json/_debug/
output_json/_index/downloaded_manuals.json
output_json/_review/failed_downloads.json
```

The following generated output files may be committed when the team needs the extracted demo dataset:

```text
output_json/{Brand}/
output_json/_index/manuals_index.json
output_json/_index/fault_codes_index.json
output_json/_index/processed_manuals.json
output_json/_review/low_confidence_records.json
output_json/_review/failed_extractions.json
```

## Environment setup

From the data-pipeline folder:

```bash
cd apps/data-pipeline
```

Install dependencies:

```bash
uv sync
```

Create a local `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Do not commit `.env`.

## Manual PDF discovery and download

Manual sources are configured in:

```text
input/source_registry.example.json
```

If a local custom source registry is needed, create:

```text
input/source_registry.json
```

When `source_registry.json` exists, the downloader uses it instead of the example file.

### Discover manuals

Discovery finds possible PDF/manual links and writes them to:

```text
input/manual_sources.generated.json
```

Examples:

```bash
uv run python download_manuals.py discover --brand Bosch
uv run python download_manuals.py discover --brand Vaillant
uv run python download_manuals.py discover --brand Baxi
```

### Download manuals

Downloaded PDFs are saved into brand-specific folders under:

```text
raw_pdfs/
```

Examples:

```bash
uv run python download_manuals.py download --brand Bosch
uv run python download_manuals.py download --brand Vaillant
uv run python download_manuals.py download --brand Baxi
```

For large sources, use a small limit first:

```bash
uv run python download_manuals.py download --brand Bosch --limit 5
```

## Current downloader source status

Working sources:

```text
Bosch official Home Comfort documentation pages
Vaillant via FreeBoilerManuals
Baxi via FreeBoilerManuals
Direct PDF links
```

Experimental or partially manual sources:

```text
Unical official site crawler
Viessmann official source collector
```

Unical and Viessmann may require manually verified direct PDF downloads because their site structures and download behavior are less reliable.

## Structured extraction pipeline

The extraction pipeline reads PDFs from:

```text
raw_pdfs/
```

It recursively finds PDFs, so brand folders work automatically.

### Process all downloaded PDFs

```bash
uv run python run_pipeline.py
```

### Process one brand only

```bash
uv run python run_pipeline.py --brand Bosch
```

### Process only a few PDFs

```bash
uv run python run_pipeline.py --brand Bosch --limit 1
```

### Force reprocessing

The pipeline uses file hashes to skip already processed PDFs.

To reprocess already processed PDFs:

```bash
uv run python run_pipeline.py --brand Bosch --force
```

Or with a limit:

```bash
uv run python run_pipeline.py --brand Bosch --force --limit 1
```

## Recommended safe workflow

For a safe test run:

```bash
uv run python download_manuals.py discover --brand Bosch
uv run python download_manuals.py download --brand Bosch --limit 5
uv run python run_pipeline.py --brand Bosch --limit 1
```

If the output looks good, increase the limit gradually.

Do not run hundreds of manuals through Gemini before checking runtime, cost, and output quality.

## Output JSON structure

Structured extraction outputs are written to:

```text
output_json/
```

Example:

```text
output_json/
  Bosch/
    bosch_greenstar-wall-boiler_abc123.json

  Vaillant/
    vaillant_ecotec-plus_xyz789.json

  Baxi/
    baxi_duo-tec_123abc.json

  Unical/
    unical_kone_456def.json

  Viessmann/
    viessmann_vitodens_789abc.json

  Buderus/
    buderus_logamax-plus_123xyz.json

  _index/
    manuals_index.json
    fault_codes_index.json
    processed_manuals.json

  _review/
    low_confidence_records.json
    failed_extractions.json

  _debug/
    raw and repaired Gemini responses
```

## Full manual JSON files

Brand folders contain full extracted manual data.

A full manual JSON may contain:

```text
schema_version
document_meta
technical_specs
fault_codes
diagnostic_codes
status_codes
safety_warnings
maintenance_tasks
search_terms
derived_guidance
extraction_meta
```

These files are the main source-of-truth extracted data.

## Index files

### manuals_index.json

Path:

```text
output_json/_index/manuals_index.json
```

Purpose:

```text
lists successfully processed manuals
stores brand/model/manual metadata
points to the full output JSON file
shows confidence and review status
```

### fault_codes_index.json

Path:

```text
output_json/_index/fault_codes_index.json
```

Purpose:

```text
contains a flattened list of extracted fault codes
supports quick search by code/component/symptom
points back to the full manual JSON using output_file
```

If multiple brands/manuals are processed, this file contains fault-code records from all successfully processed manuals.

### processed_manuals.json

Path:

```text
output_json/_index/processed_manuals.json
```

Purpose:

```text
tracks processed PDF hashes
prevents repeated Gemini calls for the same PDF
used by pipeline skip logic
```

## Review files

### low_confidence_records.json

Path:

```text
output_json/_review/low_confidence_records.json
```

Purpose:

```text
collects records that require human review
keeps uncertain or incomplete records visible
helps identify extraction quality issues
```

A record may appear here when:

```text
confidence is low
review_required is true
possible causes are missing
manufacturer steps are missing
source references are unclear
JSON was repaired after malformed Gemini output
```

### failed_extractions.json

Path:

```text
output_json/_review/failed_extractions.json
```

Purpose:

```text
tracks manuals that failed during extraction
helps with retry planning and debugging
```

Common failure reasons:

```text
Gemini 503 high demand
invalid API key
malformed response
schema validation failure
empty or invalid PDF
```

## Debug files

Debug files are written under:

```text
output_json/_debug/
```

This folder can contain:

```text
raw Gemini responses
repaired Gemini responses
schema validation error logs
```

Do not commit `_debug/`.

## Notes about Buderus outputs

Some PDFs discovered from Bosch-related sources may be extracted under:

```text
output_json/Buderus/
```

This can happen when the actual manual/document brand is Buderus, even if the source came through Bosch Home Comfort pages.

This is not automatically wrong. It should be treated as useful extracted data, but later validation should compare:

```text
source/download brand
extracted document_meta.brand_name
output folder brand
```

## Confidence and review_required

Each extracted record may include:

```text
confidence
review_required
source_refs
```

Important:

```text
confidence is a review signal, not absolute proof of correctness
review_required means the record should be checked before production use
source_refs should be used to trace extracted data back to the manual page
```

## Windows logging issue

On Windows PowerShell, emoji output can cause encoding errors.

Use this before long runs:

```powershell
chcp 65001
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

Then run Python with UTF-8 mode:

```powershell
uv run python -X utf8 run_pipeline.py --brand Bosch --limit 10
```

For logs:

```powershell
mkdir logs
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
uv run python -X utf8 run_pipeline.py --brand Bosch --limit 10 2>&1 | Tee-Object "logs/bosch_$ts.log"
```

## Recommended usage for teammates

Backend developers should use:

```text
output_json/{Brand}/
output_json/_index/manuals_index.json
output_json/_index/fault_codes_index.json
```

Frontend/mobile developers should usually use:

```text
manuals_index.json for manual/library lists
fault_codes_index.json for fault-code search
full manual JSON files for detail views
```

Data pipeline developers should use:

```text
raw_pdfs/
download_manuals.py
run_pipeline.py
source_registry.example.json
schemas.py
prompts/
_review/
_debug/
```
