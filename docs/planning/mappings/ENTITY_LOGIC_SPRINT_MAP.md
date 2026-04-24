# Entity and Logic Sprint Map

Last updated: 2026-04-24  
Purpose: define which entities are introduced or expanded per sprint and the business logic attached to each.

Legend:
- `Kind`: API DB, Mobile Cache, Pipeline Schema
- `State`: `existing`, `new`, `expand`

## Core entities

| Entity | Kind | Owner | Sprint | State | Requirement Mapping | Required Logic |
|---|---|---|---|---|---|---|
| `User` | API DB | Backend | 1 | existing | FR-01 to FR-05 | auth role checks, secure credential validation |
| `RefreshSession` | API DB | Backend | 1 | new | FR-01 to FR-05 | refresh token rotation/invalidation |
| `Client` | API DB | Backend | 1 | existing | FR-07 to FR-09 | contact/address retrieval for jobs |
| `Job` | API DB | Backend | 1 | expand | FR-07 to FR-12 | status transitions, schedule conflict checks |
| `Site` | API DB | Backend | 1 | new | FR-10 to FR-12 | address/coordinates link for scheduling |
| `JobCache` | Mobile Cache | Frontend | 1 | new | NR-03, FR-07 to FR-12 | offline reads and freshness metadata |
| `SyncQueueItem` | Mobile Cache | Frontend | 1 | new | NR-03 to NR-05 | queued writes, retry state, idempotency key |
| `SyncLog` | API DB/Mobile Cache | Backend + Frontend | 1 | new | NR-04 to NR-05 | sync outcome tracking and diagnostics |

## Library and service entities

| Entity | Kind | Owner | Sprint | State | Requirement Mapping | Required Logic |
|---|---|---|---|---|---|---|
| `BoilerModel` | API DB | Backend + Data | 2 | new | FR-14 to FR-16 | model indexing, search aliases |
| `FaultCode` | API DB | Backend + Data | 2 | new | FR-14 to FR-16 | code lookup, multilingual text, severity |
| `Part` | API DB | Backend + Data | 2 | new | FR-14 to FR-16 | model compatibility and pricing references |
| `Manual` | API DB | Backend + Data | 2 | new | FR-14 to FR-16 | source document linkage and metadata |
| `ServiceLog` | API DB | Backend | 2 | new | FR-17 to FR-18 | create/edit history with sync-safe updates |
| `LaborEntry` | API DB | Backend | 2 | new | FR-17 to FR-18 | duration and labor cost calculation |
| `ConsumedPart` | API DB | Backend | 2 | new | FR-17 to FR-18 | quantity and part-cost aggregation |
| `Expense` | API DB | Backend | 2 | new | FR-19 to FR-23 | non-job cost tracking |
| `AnalyticsSnapshot` | Mobile Cache | Frontend | 2 | new | FR-19 to FR-23 | local period-based metric snapshots |

## Warranty and hardening entities

| Entity | Kind | Owner | Sprint | State | Requirement Mapping | Required Logic |
|---|---|---|---|---|---|---|
| `Warranty` | API DB | Backend | 3 | new | FR-24 to FR-26 | activation, expiry, status rules |
| `TechnicalProperty` | API DB | Backend + Data | 3 | new | FR-24 to FR-26 | bounds/range validation for commissioning |
| `ReferenceTable` | API DB | Backend + Data | 3 | new | FR-24 to FR-26 | lookup tables for validation calculations |
| `PipelineRun` | Pipeline Schema | Data Engineer | 3 | new | NR-Reliability | run metadata, performance and failure tracking |
| `ExtractionError` | Pipeline Schema | Data Engineer | 3 | new | NR-Reliability | structured failed-record logging and retry linkage |

## Pipeline schema entities

| Entity | Kind | Owner | Sprint | State | Requirement Mapping | Required Logic |
|---|---|---|---|---|---|---|
| `DocumentMeta` | Pipeline Schema | Data Engineer | 1 | new | FR-14 prep | source identification (manufacturer, version, page) |
| `ExtractionSpan` | Pipeline Schema | Data Engineer | 1 | new | FR-14 prep | source traceability (`page`, `offset`, `snippet`) |
| `CandidateEntity` | Pipeline Schema | Data Engineer | 1 | new | FR-14 prep | uncertain extraction representation with confidence |
| `NormalizedEntity` | Pipeline Schema | Data Engineer | 1 | new | FR-14 prep | canonical ingestion-ready representation |

## Entity completion rule

An entity is considered sprint-complete only when:

1. schema is merged with migration or cache setup
2. required logic for that sprint is implemented
3. consuming service contracts are updated
4. test or QA evidence exists for main rules
