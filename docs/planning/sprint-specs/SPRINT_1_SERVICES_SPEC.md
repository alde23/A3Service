# Sprint 1 Services Implementation Spec

Last updated: 2026-04-24  
Sprint window: Weeks 1-2  
Purpose: define exactly which services are implemented in Sprint 1 and what logic is in scope now versus deferred.

## Sprint 1 objective

Establish an executable foundation for auth, scheduling, offline cache, and pipeline contracts so juniors can start coding without architectural ambiguity.

## In-scope requirements

- FR-01 to FR-05 (Auth/Profile baseline)
- FR-07 to FR-12 (Scheduling and field operations baseline)
- NR-03 to NR-05 (Offline autonomy and sync integrity baseline)
- NR-Localization baseline for Bosnian/English toggle

## Backend services (Sprint 1)

## `AuthService`

Owner: Backend  
Requirements: FR-01 to FR-05  
Entities: `User`, `RefreshSession`

API surface:
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

Logic in scope:
- credential validation
- access token issue and expiry
- refresh session validation and rotation
- logout invalidation

Deferred:
- advanced device/session management
- external identity providers

Acceptance:
- refresh flow works after access expiry
- invalid refresh token is rejected with stable error shape

## `JobsService`

Owner: Backend  
Requirements: FR-07 to FR-09  
Entities: `Job`, `Client`, `User`

API surface:
- `GET /jobs`
- `GET /jobs/:id`
- `POST /jobs`
- `PATCH /jobs/:id`
- `PATCH /jobs/:id/status`

Logic in scope:
- role-aware job retrieval
- job creation/update validation
- safe status transition rules

Deferred:
- full workflow automations and escalation rules

Acceptance:
- invalid status transitions are blocked
- role restrictions enforced on create/update operations

## `SchedulingService`

Owner: Backend  
Requirements: FR-10 to FR-12  
Entities: `Job`, `Site`

API surface:
- `GET /jobs/suggestions`
- scaffold contract endpoints under `/scheduling/*`

Logic in scope:
- conflict detection by technician/date/time window
- available slot suggestion baseline
- route optimization contract stubs with `501`

Deferred:
- production-grade route optimization engine
- external geocoding matrix integration

Acceptance:
- conflict check prevents overlapping jobs
- suggestion endpoint returns deterministic slot candidates for same inputs

## `SyncService` (contract baseline)

Owner: Backend  
Requirements: NR-03 to NR-05  
Entities: `SyncQueueItem`, `SyncLog`

API surface (baseline contract, may be scaffolded):
- `GET /sync/status`
- `POST /sync/reconcile`

Logic in scope:
- represent pending/success/failed sync state
- idempotent request handling contract

Deferred:
- full conflict auto-merge strategy

Acceptance:
- repeated reconcile payload does not duplicate records
- sync result shape is stable for mobile handling

## Frontend services (Sprint 1)

## `AuthApiService`

Owner: Frontend  
Requirements: FR-01 to FR-05

Logic in scope:
- login/logout/refresh/me calls
- auth state persistence
- guarded navigation based on auth state

Acceptance:
- app restart restores valid session
- auth failures redirect to login path

## `I18nService`

Owner: Frontend  
Requirements: Localization baseline

Logic in scope:
- Bosnian default language
- runtime English switch
- persistence of language preference

Acceptance:
- tab labels and core actions switch language without restart

## `JobsCacheRepository` and `SyncQueueRepository`

Owner: Frontend  
Requirements: FR-07 to FR-12, NR-03 to NR-05  
Entities: `JobCache`, `SyncQueueItem`, `SyncLog`

Logic in scope:
- local SQLite reads for job list/detail
- queued offline writes for status updates
- queue item state transitions (`pending`, `synced`, `failed`)

Acceptance:
- jobs remain visible offline
- queue persists across app restarts

## Data services (Sprint 1)

## `PipelineStageOrchestrator`

Owner: Data Engineer  
Requirements: FR-14 preparation, NR-Reliability  
Entities: `DocumentMeta`, `ExtractionSpan`, `CandidateEntity`, `NormalizedEntity`

Logic in scope:
- Bronze/Silver/Gold stage separation
- deterministic rerun output
- confidence and source-span traceability

Acceptance:
- rerun with same input set yields stable output
- low-confidence records exported to manual-review output

## `SchemaNormalizationService`

Owner: Data Engineer  
Requirements: FR-14 preparation

Logic in scope:
- normalize entity keys and enums for backend ingest
- enforce required fields and confidence constraints

Acceptance:
- ingestion trial uses Gold outputs without manual reshaping

## Sprint 1 integration handoffs

Backend to Frontend:
- auth and jobs DTOs, error codes, and sync status schema

Data Engineer to Backend:
- Gold payload schema, required fields, and example batch files

Frontend to Backend:
- endpoint mismatch reports with sample payloads

## Open questions to resolve in Sprint 1 kickoff

1. Should local demo DB be SQLite-only for onboarding, with PostgreSQL reserved for staging?
2. Which sync conflict policy is required for demo mode: last-write-wins or manual retry only?
3. What is the minimum accepted confidence threshold for auto-ingest versus manual review?
