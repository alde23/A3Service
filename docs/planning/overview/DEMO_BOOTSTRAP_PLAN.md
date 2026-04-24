# Demo Bootstrap Plan

Last updated: 2026-04-24  
Purpose: get the project into a stable "development demo" state quickly, with clear starting points for junior developers.

## Current baseline

- API exists (`NestJS`) with basic jobs/scheduling modules.
- Auth is partial (`POST /auth/login` only).
- Prisma schema is minimal (`User`, `Client`, `Job`).
- Mobile screens are mostly mock UI; auth/i18n/offline cache are not wired.
- CI is lint-only.
- Data pipeline exists, but extraction schema is still uncertain across manufacturers.

## Hard execution order

1. Auth completion and stable Prisma baseline
2. Frontend i18n and shared styling foundation
3. Local SQLite cache and sync queue
4. Test smoke suite and CI quality gate
5. Scheduler skeleton from class diagram
6. Data pipeline schema hardening and ingestion contract

No parallel feature work before items 1-4 are in place.

## Phase 0 deliverables (5 days)

- Fresh clone can run API and mobile with seed data.
- `login`, `me`, `refresh`, `logout` flow works.
- Local dev DB can be created from documented commands.
- Bosnian and English labels are switchable in the app.
- SQLite tables exist for cache and sync queue.
- PR checks fail on lint/type/test smoke failures.
- Scheduler module exposes scaffolded endpoints with explicit TODO markers.

## Work packages

## Backend (`BE`)

| ID | Task | Estimate | Output | Depends on |
|---|---|---:|---|---|
| BE-01 | Lock local DB mode and scripts | 4h | reproducible `migrate/generate/seed` flow | none |
| BE-02 | Complete auth API contract | 6h | `login/me/refresh/logout` + DTOs | BE-01 |
| BE-03 | Add minimal demo entities | 8h | Prisma migration for `Site`, `ServiceLog`, `LaborEntry`, `ConsumedPart`, `BoilerModel`, `Part`, `FaultCode`, `Warranty`, `SyncLog` | BE-01 |
| BE-04 | Scheduler skeleton | 6h | controller/service stubs + `501` for unimplemented routes | BE-03 |

## Frontend (`FE`)

| ID | Task | Estimate | Output | Depends on |
|---|---|---:|---|---|
| FE-01 | i18n baseline | 4h | `i18next` with `bs` default and `en` toggle | none |
| FE-02 | styling baseline | 4h | shared theme tokens for colors/type/spacing | FE-01 |
| FE-03 | auth flow integration | 6h | guarded routing + token persistence | BE-02 |
| FE-04 | SQLite cache + queue | 8h | `jobs_cache`, `service_logs_cache`, `sync_queue`, `sync_log` repos | FE-03 |

## Quality (`QA`)

| ID | Task | Estimate | Output | Depends on |
|---|---|---:|---|---|
| QA-01 | smoke tests | 6h | auth/jobs smoke tests in API + mobile | BE-02, FE-03 |
| QA-02 | CI quality gate | 4h | lint + typecheck + tests in CI | QA-01 |

## Data (`DP`)

| ID | Task | Estimate | Output | Depends on |
|---|---|---:|---|---|
| DP-01 | canonical extraction schema | 6h | intermediate schema with confidence and source spans | none |
| DP-02 | bronze/silver/gold split | 8h | deterministic outputs + manual review queue | DP-01 |

## Scheduler skeleton contract

Scaffold now, implement later:

- `GET /scheduling/agenda`
- `POST /scheduling/reorder`
- `POST /scheduling/eta`
- `POST /scheduling/optimize-route`

If behavior is not implemented, return `501 Not Implemented` with a clear message.

TODO format for stubs:

```ts
// TODO(scheduling): implement with real travel-time matrix.
// Input: ordered jobs with site coordinates.
// Output: reordered jobs plus ETA per stop.
// Missing dependency: GeoCodingService.travelMatrix().
// Validation test: optimized route should reduce total travel time.
```

## 10-day sequence

### Days 1-2
- BE-01, BE-02, FE-01

### Days 3-4
- FE-02, FE-03, BE-03, QA-01

### Days 5-6
- FE-04, BE-04, QA-02

### Days 7-8
- DP-01, DP-02, sync endpoint wiring

### Days 9-10
- bugfix pass, documentation cleanup, demo rehearsal

## Definition of done for this phase

- each task has code, owner, and acceptance check
- at least one test or manual test script per feature
- offline behavior validated once
- unresolved TODOs reference backlog ticket IDs
