# Sprint 3 Services Implementation Spec

Last updated: 2026-04-24  
Sprint window: Weeks 5-6  
Purpose: define exactly which services are implemented in Sprint 3 and what logic is in scope now versus deferred.

## Sprint 3 objective

Finalize warranty workflows, sync hardening, and staging readiness so the project is demo-stable and regression-resistant.

## In-scope requirements

- FR-24 to FR-26 (Warranty and commissioning)
- NR-04 to NR-05 (Conflict-safe synchronization hardening)
- NR-Reliability and NR-Performance staging baseline
- cross-sprint regression stability (auth, jobs, library, logs, analytics)

## Backend services (Sprint 3)

## `WarrantyService`

Owner: Backend  
Requirements: FR-24 to FR-26  
Entities: `Warranty`, `Job`, `BoilerModel`

API surface:
- `POST /warranties`
- `GET /warranties`
- `GET /warranties/:id`
- `PATCH /warranties/:id/status`

Logic in scope:
- warranty activation and expiry rule enforcement
- link warranty to commissioning/service context
- status transitions (`active`, `expired`, `void`) with validation

Deferred:
- advanced claims processing workflows

Acceptance:
- invalid activation payloads are rejected with actionable error reasons
- expiry/status evaluations are deterministic for date-bound checks

## `CommissioningService`

Owner: Backend  
Requirements: FR-24 to FR-26  
Entities: `TechnicalProperty`, `ReferenceTable`, `BoilerModel`

API surface:
- `POST /commissioning/validate`
- `GET /commissioning/reference/:modelId`

Logic in scope:
- technical reading validation against model-specific reference ranges
- structured out-of-range diagnostics for frontend display
- reusable validation contract for warranty gating

Deferred:
- rule authoring UI and dynamic rule editor

Acceptance:
- validation response clearly identifies violated properties and expected ranges
- same input readings produce same validation result

## `SyncConflictResolver`

Owner: Backend  
Requirements: NR-04 to NR-05  
Entities: `SyncLog`, `SyncQueueItem`, `ServiceLog`, `Warranty`

API surface:
- `POST /sync/conflicts/resolve`
- `GET /sync/conflicts`

Logic in scope:
- detect conflicting offline vs online record versions
- apply explicit policy (`server_wins`, `client_wins`, `manual_review`)
- persist resolution audit trail for diagnostics

Deferred:
- fully automatic domain-specific merge heuristics

Acceptance:
- conflict scenarios are reproducible in tests
- each resolution writes a traceable sync-log entry

## Frontend services (Sprint 3)

## `WarrantyFlowService`

Owner: Frontend  
Requirements: FR-24 to FR-26

Logic in scope:
- warranty capture/update UI flow
- commissioning input and validation result display
- sync-aware warranty status timeline

Acceptance:
- warranty flow is usable offline with queued submission
- failed commissioning validation is clear and actionable

## `SyncRecoveryUXService`

Owner: Frontend  
Requirements: NR-04 to NR-05

Logic in scope:
- conflict notification surfaces and retry actions
- resolution path UI mapped to backend conflict policy
- diagnostic details available for support troubleshooting

Acceptance:
- user can resolve/retry failed sync without app restart
- conflict states are visible and not silently swallowed

## `RegressionTestHarness`

Owner: Frontend  
Requirements: NR-Reliability

Logic in scope:
- automate core flow checks for auth/jobs/library/logging/analytics/warranty
- test fixtures for offline/sync failure scenarios

Acceptance:
- regression harness runs in CI and blocks known critical regressions

## Data services (Sprint 3)

## `PipelineResilienceService`

Owner: Data Engineer  
Requirements: NR-Reliability, NR-Performance  
Entities: `PipelineRun`, `ExtractionError`

Logic in scope:
- retryable failure handling and structured error capture
- run-level metrics (duration, throughput, failure counts)
- reproducible run metadata for staged release audits

Acceptance:
- failed records are captured with retry linkage
- run summary report is generated for every batch

## `ReleaseDatasetService`

Owner: Data Engineer  
Requirements: FR-14 to FR-16 continuity, NR-Reliability

Logic in scope:
- versioned release artifact packaging (dataset + manifest + changelog)
- backward-compatibility checks for ingestion contracts

Acceptance:
- staged backend can ingest current and previous release dataset versions
- release manifest clearly documents breaking vs non-breaking changes

## Sprint 3 integration handoffs

Backend to Frontend:
- warranty and commissioning validation contracts, conflict resolution payloads, new error codes

Data Engineer to Backend:
- release dataset manifests, compatibility notes, and resilience run reports

Frontend to Backend:
- conflict UX telemetry and unresolved edge-case samples for policy tuning

## Open questions to resolve in Sprint 3 kickoff

1. Which conflict policy is default per domain object (`ServiceLog`, `Warranty`)?
2. What minimum regression suite is required to approve staging release candidate?
3. Which warranty statuses must be visible in demo versus hidden as internal states?
