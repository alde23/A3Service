# Service to Requirement Map

Last updated: 2026-04-24  
Purpose: define which services are implemented in which sprint, what logic they own, and which SRS requirements they satisfy.

Legend:
- `Layer`: API, Mobile, Pipeline
- `Status`: `existing`, `planned`, `expand`

## Sprint 1 services

| Service | Layer | Owner | Status | SRS Mapping | Core Logic | Primary Entities |
|---|---|---|---|---|---|---|
| `AuthService` | API | Backend | expand | FR-01 to FR-05, NR-Security | login, token issue, refresh, logout, current-user lookup | `User`, `RefreshSession` |
| `JobsService` | API | Backend | expand | FR-07 to FR-09 | jobs list/detail/create/update, RBAC checks, status transitions | `Job`, `Client`, `User` |
| `SchedulingService` | API | Backend | expand | FR-10 to FR-12 | conflict detection, available slot suggestions, scaffold route optimization contract | `Job`, `Site` |
| `SyncService` | API | Backend | planned | NR-03 to NR-05 | sync status summary and queued write reconciliation contract | `SyncQueueItem`, `SyncLog` |
| `AuthApiService` | Mobile | Frontend | planned | FR-01 to FR-05 | call auth endpoints and handle auth state transitions | n/a (API client service) |
| `I18nService` | Mobile | Frontend | planned | NR-Localization | Bosnian default, English fallback, runtime language switch | `LanguagePreference` |
| `JobsCacheRepository` | Mobile | Frontend | planned | NR-03, FR-07 to FR-12 | store and load jobs from local SQLite | `JobCache` |
| `SyncQueueRepository` | Mobile | Frontend | planned | NR-03 to NR-05 | queue offline writes and mark sync result | `SyncQueueItem`, `SyncLog` |
| `PipelineStageOrchestrator` | Pipeline | Data Engineer | planned | FR-14 (prep), NR-Reliability | run Bronze/Silver/Gold stages deterministically | `DocumentMeta`, `CandidateEntity`, `NormalizedEntity` |

## Sprint 2 services

| Service | Layer | Owner | Status | SRS Mapping | Core Logic | Primary Entities |
|---|---|---|---|---|---|---|
| `LibraryService` | API | Backend | planned | FR-14 to FR-16 | search/filter/list models, faults, parts | `BoilerModel`, `FaultCode`, `Part` |
| `LibraryIngestionService` | API | Backend | planned | FR-14 to FR-16 | ingest validated Gold datasets from pipeline | `BoilerModel`, `FaultCode`, `Part`, `Manual` |
| `ServiceLogService` | API | Backend | planned | FR-17 to FR-18 | create/update/list service logs and history | `ServiceLog`, `LaborEntry`, `ConsumedPart` |
| `AnalyticsService` | API | Backend | planned | FR-19 to FR-23 | earnings, expense, profitability aggregation by period | `ServiceLog`, `Expense` |
| `LibraryScreenService` | Mobile | Frontend | planned | FR-14 to FR-16 | offline search/filter in local dataset | `BoilerModel`, `FaultCode`, `Part` cache |
| `ServiceLogFormService` | Mobile | Frontend | planned | FR-17 to FR-18 | form state, local save, sync-ready payload creation | `ServiceLogDraft` |
| `AnalyticsScreenService` | Mobile | Frontend | planned | FR-19 to FR-23 | local metrics calculation and period switching | `AnalyticsSnapshot` |
| `DatasetNormalizationService` | Pipeline | Data Engineer | planned | FR-14 to FR-16 | dedup, alias normalization, confidence thresholding | `NormalizedEntity` |

## Sprint 3 services

| Service | Layer | Owner | Status | SRS Mapping | Core Logic | Primary Entities |
|---|---|---|---|---|---|---|
| `WarrantyService` | API | Backend | planned | FR-24 to FR-26 | create/list/validate warranty records | `Warranty`, `BoilerModel`, `Job` |
| `CommissioningService` | API | Backend | planned | FR-24 to FR-26 | validate technical readings against model ranges | `TechnicalProperty`, `ReferenceTable` |
| `SyncConflictResolver` | API | Backend | planned | NR-04 to NR-05 | resolve conflicting offline/online edits | `SyncLog`, `SyncQueueItem` |
| `WarrantyFlowService` | Mobile | Frontend | planned | FR-24 to FR-26 | warranty capture and status UI flow | `WarrantyDraft` |
| `RegressionTestHarness` | Mobile | Frontend | planned | NR-Reliability | run core flow regressions and sync error scenarios | n/a |
| `PipelineResilienceService` | Pipeline | Data Engineer | planned | NR-Reliability, NR-Performance | retries, error reporting, batch performance checks | `PipelineRun`, `ExtractionError` |

## Service completion rule

A service is considered complete for a sprint only when:

1. implementation is merged
2. acceptance checks pass
3. contracts are shared with dependent roles
4. unresolved TODOs are linked to backlog IDs
