# Sprint 1 Artifacts Spec

Last updated: 2026-04-24  
Purpose: define Sprint 1 deliverables beyond services: endpoints, routes/screens, entities/migrations, pipeline outputs, and tests.

## In-scope requirement baseline

- FR-01 to FR-05
- FR-07 to FR-12
- NR-03 to NR-05
- localization baseline

## 1) API artifact set (backend)

## Endpoints

Required:
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /jobs`
- `GET /jobs/:id`
- `POST /jobs`
- `PATCH /jobs/:id`
- `PATCH /jobs/:id/status`
- `GET /jobs/suggestions`
- `GET /sync/status` (baseline contract)
- `POST /sync/reconcile` (baseline contract)

Rules:
- all endpoints return stable error shape
- auth and role checks are enforced
- idempotency is defined for sync writes

## DTO/contracts

Required:
- auth response DTOs
- job list/detail DTOs
- job status update DTO
- sync status/reconcile DTOs

Rules:
- DTO changes must be communicated same day to frontend/data

## 2) Mobile artifact set (frontend)

## Routes/screens

Required:
- auth entry route
- jobs list route
- job detail route
- language/settings surface

Rules:
- unauthenticated users cannot access app tabs
- primary labels/actions come from i18n keys

## Local storage artifacts

Required SQLite tables:
- `jobs_cache`
- `sync_queue`
- `sync_log`
- `app_preferences` (language/auth metadata as needed)

Rules:
- queue item lifecycle includes `pending/synced/failed`
- offline reads must not require network

## 3) Data pipeline artifact set (data engineer)

## Stage outputs

Required:
- Bronze output (raw parse + metadata)
- Silver output (candidate extraction + confidence)
- Gold output (normalized ingest-ready records)
- low-confidence review output

Rules:
- each Gold record links to source span/page
- rerun with same input set should be stable

## Data contracts

Required:
- canonical schema definitions in `schemas.py`
- example ingest payload for backend

Rules:
- required fields and enums are validated before output is marked Gold

## 4) Entity/schema artifact set

## API DB artifacts

Required:
- auth/session-supporting schema updates
- scheduling-supporting schema updates (`Site` baseline if used)
- sync-supporting schema (`SyncLog`/queue contract)

Rules:
- migration is reproducible on fresh clone
- seed data supports Sprint 1 demo flow

## Mobile schema artifacts

Required:
- repository interfaces for cache and queue
- migration/init SQL for local tables

Rules:
- init script is idempotent

## 5) Test artifact set

## Backend tests

Required:
- auth smoke tests
- jobs/scheduling smoke tests
- sync contract smoke tests (at least request shape + idempotency baseline)

## Frontend tests

Required:
- auth route-guard behavior tests
- jobs list/detail rendering with cache fallback
- language toggle persistence test

## Data tests

Required:
- schema validation tests for Bronze/Silver/Gold
- deterministic rerun check for a fixed sample input set

## 6) Definition of done per artifact type

Endpoint/DTO:
- implemented + validated + documented + tested

Screen/route:
- reachable + handles loading/error/offline states

Entity/migration:
- migration applied + seed verified + rollback path known

Pipeline output:
- schema-valid + confidence traceable + ingest-ready

Test artifact:
- executable in local/CI context and linked to a sprint acceptance check
