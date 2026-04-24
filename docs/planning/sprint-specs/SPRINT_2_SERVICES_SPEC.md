# Sprint 2 Services Implementation Spec

Last updated: 2026-04-24  
Sprint window: Weeks 3-4  
Purpose: define exactly which services are implemented in Sprint 2 and what logic is in scope now versus deferred.

## Sprint 2 objective

Deliver a complete offline-first technical-library and service-logging flow, plus baseline analytics backed by deterministic pipeline ingestion.

## In-scope requirements

- FR-14 to FR-16 (Technical library and data ingestion baseline)
- FR-17 to FR-18 (Service logging baseline)
- FR-19 to FR-23 (Analytics baseline)
- NR-03 to NR-05 (Offline and sync integrity expansion)
- NR-Performance baseline for search and analytics response

## Backend services (Sprint 2)

## `LibraryService`

Owner: Backend  
Requirements: FR-14 to FR-16  
Entities: `BoilerModel`, `FaultCode`, `Part`

API surface:
- `GET /library/search`
- `GET /library/models`
- `GET /library/models/:id`
- `GET /library/faults/:code`
- `GET /library/parts/:id`

Logic in scope:
- search/filter/sort with stable pagination
- model-fault-part join queries for field troubleshooting
- deterministic sorting to support offline cache sync

Deferred:
- advanced fuzzy relevance tuning
- semantic/vector retrieval

Acceptance:
- repeated query with same filters returns stable ordering
- pagination metadata is consistent (`total`, `page`, `pageSize`)

## `LibraryIngestionService`

Owner: Backend  
Requirements: FR-14 to FR-16  
Entities: `BoilerModel`, `FaultCode`, `Part`, `Manual`

API surface:
- `POST /library/ingest`
- `POST /library/ingest/validate`
- `GET /library/ingest/runs/:id`

Logic in scope:
- validate Gold dataset schema and required fields
- idempotent upsert rules keyed by canonical IDs
- ingestion run reporting (accepted/rejected counts)

Deferred:
- full async ingestion orchestration and worker queues

Acceptance:
- replaying the same ingest payload does not duplicate records
- validation endpoint reports field-level reasons for rejected records

## `ServiceLogService`

Owner: Backend  
Requirements: FR-17 to FR-18, NR-03 to NR-05  
Entities: `ServiceLog`, `LaborEntry`, `ConsumedPart`, `Job`

API surface:
- `GET /service-logs`
- `GET /service-logs/:id`
- `POST /service-logs`
- `PATCH /service-logs/:id`
- `POST /service-logs/:id/sync`

Logic in scope:
- create/update service logs with labor and part consumption
- enforce status-safe edits after sync
- idempotent sync merge keyed by client operation ID

Deferred:
- rich audit diff UI payloads
- complex merge strategies beyond defined conflict policy

Acceptance:
- retried sync payload with same idempotency key is safe
- service log totals match labor and consumed-part inputs

## `AnalyticsService`

Owner: Backend  
Requirements: FR-19 to FR-23  
Entities: `ServiceLog`, `Expense`

API surface:
- `GET /analytics/summary`
- `GET /analytics/earnings`
- `GET /analytics/expenses`
- `GET /analytics/profitability`

Logic in scope:
- period-based aggregations (day/week/month/custom range)
- normalization of missing values to zero-safe outputs
- response schema stable for dashboard rendering

Deferred:
- predictive forecasting
- advanced comparative cohort analytics

Acceptance:
- sampled aggregation checks match underlying records
- date-range boundary behavior is consistent and documented

## Frontend services (Sprint 2)

## `LibraryScreenService`

Owner: Frontend  
Requirements: FR-14 to FR-16

Logic in scope:
- library search/filter screens backed by SQLite cache
- background sync refresh for stale datasets
- deterministic empty/error/loading states

Acceptance:
- library search/filter remains functional in airplane mode
- stale cache warning appears when sync has not run recently

## `ServiceLogFormService`

Owner: Frontend  
Requirements: FR-17 to FR-18, NR-03 to NR-05

Logic in scope:
- service log form state and draft persistence
- local validation of required fields before queueing
- sync-ready payload builder with client operation IDs

Acceptance:
- partially completed logs survive app restart
- queued logs sync successfully when connectivity returns

## `AnalyticsScreenService`

Owner: Frontend  
Requirements: FR-19 to FR-23

Logic in scope:
- period selector and dashboard metric cards
- local snapshot rendering with sync-aware refresh indicator
- fallback to cached snapshot when API unavailable

Acceptance:
- period switch updates metrics without screen reload
- analytics view shows last-sync timestamp and stale state

## Data services (Sprint 2)

## `DatasetNormalizationService`

Owner: Data Engineer  
Requirements: FR-14 to FR-16  
Entities: `NormalizedEntity`, `Manual`

Logic in scope:
- canonicalize model/fault/part identifiers and aliases
- apply dedup and conflict-resolution rules
- enforce multilingual label normalization where present

Acceptance:
- duplicate records collapse under canonical IDs
- normalized outputs pass backend ingestion validation

## `ExtractionQualityService`

Owner: Data Engineer  
Requirements: FR-14 to FR-16, NR-Reliability

Logic in scope:
- quality report generation by manufacturer and entity type
- confidence threshold profiling for manual-review routing
- explicit unknown-field capture for schema refinement

Acceptance:
- quality report is published for each ingestion-ready dataset batch
- low-confidence outliers are separated from auto-ingest payloads

## Sprint 2 integration handoffs

Backend to Frontend:
- library/search DTO schemas, pagination contract, sync result status codes

Data Engineer to Backend:
- validated Gold dataset snapshot, alias tables, and quality report summary

Frontend to Backend:
- payload mismatch samples from offline service-log sync attempts

## Open questions to resolve in Sprint 2 kickoff

1. Which search fields are mandatory for first mobile filter set: model, fault code, part name, manufacturer?
2. What is the sync conflict policy for service-log edits after partial server acceptance?
3. What max ingestion batch size is supported in demo/staging without async workers?
