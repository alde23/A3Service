# Sprint 3 Artifacts Spec

Last updated: 2026-04-24  
Purpose: define Sprint 3 deliverables beyond services: warranty/commissioning artifacts, sync-hardening assets, staging readiness evidence, and regression outputs.

## In-scope requirement baseline

- FR-24 to FR-26
- NR-04 to NR-05
- NR-Reliability
- NR-Performance baseline for staging

## 1) API artifact set (backend)

## Endpoints

Required:
- `POST /warranties`
- `GET /warranties`
- `GET /warranties/:id`
- `PATCH /warranties/:id/status`
- `POST /commissioning/validate`
- `GET /commissioning/reference/:modelId`
- `GET /sync/conflicts`
- `POST /sync/conflicts/resolve`
- `GET /health`

Rules:
- warranty and commissioning endpoints enforce validation and role checks
- sync conflict endpoints persist resolution audit metadata
- health endpoint includes migration/schema status for staging checks

## DTO/contracts

Required:
- warranty create/update/status DTOs
- commissioning validation request/response DTOs
- sync conflict list + resolution DTOs
- health/status DTO for staging readiness

Rules:
- conflict resolution decisions are explicit enum values
- all errors map to stable, documented frontend-consumable codes

## 2) Mobile artifact set (frontend)

## Routes/screens

Required:
- warranty list/detail/create route(s)
- commissioning validation screen inside warranty flow
- sync conflict resolution and retry screen
- staging smoke checklist screen or test-only route (team choice)

Rules:
- offline submission path remains available for warranty creation
- users receive explicit recovery actions for sync failures

## Local storage artifacts

Required SQLite tables:
- `warranty_drafts`
- `warranty_queue`
- `sync_conflict_cache`
- `qa_checklist_runs` (if QA checklist is in-app)

Rules:
- warranty queue items include status and retry metadata
- conflict cache entries include source entity/version context

## 3) Data pipeline artifact set (data engineer)

## Release outputs

Required:
- versioned release dataset package (`dataset`, `manifest`, `changelog`)
- pipeline run report for each staged batch
- failed-record retry bundle and error summary

Rules:
- release package hash/checksum is generated and stored
- manifest documents schema version and compatibility guarantees

## Monitoring/quality artifacts

Required:
- extraction failure taxonomy report
- run-performance baseline report (duration/throughput/failure rate)

Rules:
- each failed record is traceable to source document and extraction stage
- performance baseline must be reproducible on agreed environment

## 4) Entity/schema artifact set

## API DB artifacts

Required:
- schema and migrations for `Warranty`, `TechnicalProperty`, `ReferenceTable`
- schema updates for conflict resolution/audit data (if separate tables are used)
- staging migration verification script/checklist

Rules:
- migration sequence is repeatable on clean staging snapshot
- rollback and recovery path is documented for each Sprint 3 migration

## Mobile schema artifacts

Required:
- repository interfaces and local models for warranty and sync-conflict flows
- SQLite migrations for Sprint 3 tables

Rules:
- local migrations are idempotent and compatible with Sprint 1-2 state

## 5) Test artifact set

## Backend tests

Required:
- warranty lifecycle validation tests
- commissioning range-validation tests
- sync conflict detection/resolution tests
- staging health and migration smoke tests

## Frontend tests

Required:
- warranty offline-create and sync tests
- conflict resolution UX flow tests
- regression tests for auth/jobs/library/logging/analytics/warranty

## Data tests

Required:
- pipeline retry/recovery tests
- dataset release compatibility checks
- run-report generation smoke tests

## 6) Definition of done per artifact type

Endpoint/DTO:
- implemented + validated + documented + covered by regression checks

Screen/route:
- usable offline/online + tested + recovery states verified

Entity/migration:
- applied on staging snapshot + rollback path validated + evidence logged

Release dataset:
- versioned + checksumed + compatibility-tested + changelog published

Test artifact:
- automated or scripted, reproducible, and linked to sprint exit criteria
