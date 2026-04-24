# Data Engineer Playbook

Last updated: 2026-04-24  
Primary stack: Python pipeline, schema normalization, dataset quality, ingestion readiness

## Role mandate

- Own extraction schema design and data quality strategy.
- Own deterministic pipeline outputs and reproducibility.
- Own dataset readiness for backend ingestion.
- Own quality reporting for uncertain or low-confidence extraction.

## Sprint 1 detailed scope

## D1. Canonical intermediate schema

Files:
- `apps/data-pipeline/src/schemas.py`
- `apps/data-pipeline/README.md`

Deliverables:
- schema for `document_meta`, `extraction_span`, `candidate_entity`, `normalized_entity`
- mandatory confidence and source reference fields

Acceptance:
- schema validates mixed manufacturer outputs
- missing required fields fail fast with clear error messages

## D2. Bronze/Silver/Gold pipeline structure

Files:
- `apps/data-pipeline/run_pipeline.py`
- `apps/data-pipeline/src/api_extractor.py`

Deliverables:
- Bronze: raw parsed material with metadata
- Silver: extracted candidates with confidence scores
- Gold: normalized ingest-ready payloads

Acceptance:
- same inputs produce stable rerun outputs
- each Gold record links back to source span/page

## D3. Demo dataset pack

Files:
- `apps/data-pipeline/output_json/*`
- `apps/data-pipeline/README.md`

Deliverables:
- curated demo dataset from a mixed manufacturer sample
- documented known limitations and confidence thresholds

Acceptance:
- backend can ingest dataset without manual reshaping
- low-confidence records exported to manual-review queue

## Sprint 2 detailed scope

## D4. Dataset expansion and dedup quality

Deliverables:
- broaden manufacturer coverage
- dedup logic across model/fault/part entities
- release candidate Gold snapshot for Sprint 2 library features

Acceptance:
- quality report includes duplicate and conflict counts
- ingestion trial completes with defined error budget

## D5. Search-readiness preparation

Deliverables:
- normalize searchable text fields and aliases
- provide indexed field recommendations for backend/mobile

Acceptance:
- sampled searches map correctly to expected entities
- alias handling documented for frontend/backend consumers

## Sprint 3 detailed scope

## D6. Pipeline resilience and performance

Deliverables:
- retry and recovery behavior for failed extraction steps
- batch run performance baseline and resource profile
- reproducible release dataset versioning

Acceptance:
- failed records are trackable and replayable
- batch run completes within agreed limits
- release artifact includes version and changelog notes

## Handoff contracts

To Backend:
- schema version, required fields, and enum constraints
- ingestion-ready Gold payload examples and error cases

To Frontend:
- searchable/display-friendly fields and fallback behavior
- limitations that impact UI rendering or filtering

## Common questions (data engineer)

Q: Should we delay sprint work until extraction is perfect?  
A: No. Deliver canonical schema, confidence scoring, and manual-review outputs first.

Q: Should low-confidence records be dropped?  
A: No. Preserve them in review output to avoid silent data loss.

Q: How do we handle different manufacturer PDF structures?  
A: Use the intermediate schema as the stable contract and keep parser-specific logic behind it.
