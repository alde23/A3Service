# A3Service Sprint Plan

Last updated: 2026-04-24  
Duration: 6 weeks (3 sprints, 2 weeks each)  
Audience: implementation team

This file is the roadmap. Detailed startup execution is in `DEMO_BOOTSTRAP_PLAN.md`.

## Goals for MVP

1. Job scheduling and field execution that works offline
2. Technical fault library with offline search
3. Service logging and profitability analytics
4. Stable sync behavior and minimum quality gates

## Sprint 1 (Weeks 1-2): Foundation and Demo Flow

Goal: developers can start coding without ambiguity; technician can complete the basic job flow.

Must-have deliverables:

- Auth flow: `login/me/refresh/logout`
- Stable Prisma schema baseline and seed data
- Mobile i18n baseline (`bs` default, `en` toggle)
- Mobile local SQLite cache and sync queue foundation
- Scheduler skeleton endpoints plus existing conflict checks
- CI gate: lint + typecheck + smoke tests

Out of scope:

- advanced route optimization
- full conflict-resolution engine
- final extraction accuracy for all manufacturers

Exit criteria:

- New developer can run project end-to-end from README
- Basic demo flow works: login -> jobs -> update/status cache -> sync queue visible
- CI blocks broken PRs

### Sprint 1 role slices

Backend:
- complete auth lifecycle (`login/me/refresh/logout`)
- lock initial Prisma baseline and seed data
- provide scheduler/conflict API + skeleton endpoints for future route logic

Frontend:
- wire auth flow and guarded routes
- implement i18n baseline and shared styling tokens
- add SQLite cache/sync queue foundation for offline mode

Data engineer:
- define canonical intermediate extraction schema (`document_meta`, `extraction_span`, `candidate_entity`, `normalized_entity`)
- implement bronze/silver/gold pipeline split with deterministic output
- produce a small curated demo dataset from mixed manufacturer PDFs
- provide schema contract for backend ingestion and low-confidence manual-review queue

Data engineer acceptance checks (Sprint 1):
- same input PDFs produce stable output on rerun
- every extracted entity includes confidence + source page/span
- demo dataset can be ingested by backend without manual reshaping
- unresolved low-confidence records are exported for manual review (not silently dropped)

## Sprint 2 (Weeks 3-4): Library, Logging, Analytics

Goal: core service workflow usable in offline-first mode.

Must-have deliverables:

- Boiler/fault/part schema and ingestion endpoints
- Technical library search and filter on mobile
- Service logging with parts and labor entries
- Basic analytics (earnings, costs, net, jobs completed)
- Initial sync of logs/expenses with idempotency guarantees

Out of scope:

- fuzzy search perfection
- advanced visual analytics polish

Exit criteria:

- Technician can diagnose/log service fully offline
- Data sync does not duplicate records
- Dashboard numbers match service logs for sampled periods

### Sprint 2 role slices

Backend:
- implement library ingestion and query endpoints
- implement service log and expense APIs with idempotent sync behavior
- expose analytics summary endpoints and period filters

Frontend:
- build offline-first library screens with search and filter
- implement service log form (faults, parts, labor, notes) with local persistence
- implement analytics screen from local data with sync-aware refresh

Data engineer:
- populate and validate model/fault/part datasets against canonical schema
- improve normalization and deduplication rules
- publish ingest-ready Gold dataset snapshots for backend import

Backend acceptance checks (Sprint 2):
- library/search endpoints respond with paginated structured results
- service-log ingestion is idempotent for retried requests
- analytics values match sampled source records

Frontend acceptance checks (Sprint 2):
- library search works offline from SQLite cache
- service logs can be created offline and remain queued until sync
- analytics period changes recalculate without network calls

Data engineer acceptance checks (Sprint 2):
- Gold datasets pass schema validation and dedup rules
- ingestion trial completes without manual JSON edits
- extraction quality report produced for sampled manufacturer PDFs

## Sprint 3 (Weeks 5-6): Warranty, Hardening, Staging

Goal: stable staging candidate with testing and operational readiness.

Must-have deliverables:

- Warranty tracking workflow
- Test coverage target and regression suite
- Performance pass on critical API/mobile flows
- Staging deployment and health checks

Out of scope:

- full production operations automation
- non-critical UX polish

Exit criteria:

- Staging demo is stable for stakeholder walkthrough
- Major flows pass tests and manual QA checklist
- No known critical data-loss scenarios

### Sprint 3 role slices

Backend:
- deliver warranty and commissioning APIs
- finalize conflict-safe sync and error handling hardening
- improve test coverage and staging reliability checks

Frontend:
- implement warranty workflows and finalize UX polish
- complete regression-oriented test scenarios for main user flows
- harden offline/sync status feedback and recovery paths

Data engineer:
- add recovery logic and monitoring signals to pipeline runs
- run larger-batch extraction tests and performance baselines
- maintain release dataset versioning and changelog

Backend acceptance checks (Sprint 3):
- warranty endpoints validate required technical ranges
- staging health checks and migration flow are repeatable
- test suite covers critical auth/scheduling/logging/warranty paths

Frontend acceptance checks (Sprint 3):
- warranty and service flows pass manual QA scripts
- sync failures surface actionable retry paths to users
- no regressions in login, jobs, library, and analytics baseline flows

Data engineer acceptance checks (Sprint 3):
- batch extraction run completes within agreed resource limits
- failed records are tracked and recoverable
- release dataset artifact is versioned and reproducible

## Cross-sprint rules

- No feature is "done" without owner, acceptance check, and test evidence.
- Any unresolved TODO must reference a backlog ticket.
- Use one source of truth for task status (board or tracker), not markdown checkmarks.
