# Sprint 2 Artifacts Spec

Last updated: 2026-04-24  
Purpose: define Sprint 2 deliverables beyond services: API contracts, mobile flows, schema/data artifacts, and verification assets.

## In-scope requirement baseline

- FR-14 to FR-16
- FR-17 to FR-18
- FR-19 to FR-23
- NR-03 to NR-05
- NR-Performance baseline

## 1) API artifact set (backend)

## Endpoints

Required:
- `GET /library/search`
- `GET /library/models`
- `GET /library/models/:id`
- `GET /library/faults/:code`
- `GET /library/parts/:id`
- `POST /library/ingest`
- `POST /library/ingest/validate`
- `GET /library/ingest/runs/:id`
- `GET /service-logs`
- `GET /service-logs/:id`
- `POST /service-logs`
- `PATCH /service-logs/:id`
- `POST /service-logs/:id/sync`
- `GET /analytics/summary`
- `GET /analytics/earnings`
- `GET /analytics/expenses`
- `GET /analytics/profitability`

Rules:
- list endpoints provide stable pagination metadata
- write endpoints define idempotency behavior explicitly
- endpoint error shape remains consistent with Sprint 1 contracts

## DTO/contracts

Required:
- library search/filter request DTO
- library item DTOs (`model`, `fault`, `part`)
- ingestion validation result DTO
- service-log create/update/sync DTOs
- analytics response DTOs with explicit period metadata

Rules:
- contract changes must be shared with frontend and data team on same day
- optional fields must be documented with defaults

## 2) Mobile artifact set (frontend)

## Routes/screens

Required:
- technical library search screen
- model/fault/part detail screen
- service log create/edit screen
- analytics dashboard screen with period selector

Rules:
- each screen supports loading/error/offline states
- search and service-log flows are usable without connectivity

## Local storage artifacts

Required SQLite tables:
- `library_models_cache`
- `library_faults_cache`
- `library_parts_cache`
- `service_log_drafts`
- `service_log_queue`
- `analytics_snapshots`

Rules:
- cache tables include freshness metadata (`updated_at` or equivalent)
- queue records carry idempotency key + retry status

## 3) Data pipeline artifact set (data engineer)

## Stage outputs

Required:
- normalized Gold dataset for `BoilerModel`, `FaultCode`, `Part`
- manufacturer alias map and canonical ID map
- ingestion-ready batch manifest with checksum/version
- quality report for sampled extraction accuracy

Rules:
- each Gold record links to source manufacturer and version metadata
- dataset versions are immutable once consumed by backend ingest

## Data contracts

Required:
- schema definitions and validators for library entities
- explicit rejected-record schema for manual review

Rules:
- confidence thresholds for auto-ingest are documented per entity type
- unknown/unmapped fields are tracked, not silently dropped

## 4) Entity/schema artifact set

## API DB artifacts

Required:
- schema and migrations for `BoilerModel`, `FaultCode`, `Part`, `Manual`
- schema and migrations for `ServiceLog`, `LaborEntry`, `ConsumedPart`, `Expense`
- indexes supporting search and period-based analytics queries

Rules:
- migration chain is reproducible on fresh clone and staging clone
- rollback procedure for each migration is documented

## Mobile schema artifacts

Required:
- repository interfaces for library cache, service-log drafts, and analytics snapshots
- SQLite migration/init scripts for new Sprint 2 tables

Rules:
- migrations are idempotent and versioned

## 5) Test artifact set

## Backend tests

Required:
- library search/filter smoke tests
- ingestion validation and idempotent ingest tests
- service-log sync idempotency tests
- analytics aggregation correctness tests

## Frontend tests

Required:
- offline library search behavior tests
- service-log draft persistence + queueing tests
- analytics period-switch rendering tests

## Data tests

Required:
- schema validation tests for normalized library entities
- dedup/canonicalization rule tests
- batch quality report generation smoke test

## 6) Definition of done per artifact type

Endpoint/DTO:
- implemented + contract-validated + documented + tested

Screen/route:
- reachable + resilient to offline and error states + tested

Entity/migration:
- migration applied + rollback documented + seed/import verified

Dataset artifact:
- schema-valid + versioned + ingest-trial successful

Test artifact:
- executable in local/CI context and mapped to sprint acceptance checks
