# Backend Developer Playbook

Last updated: 2026-04-24  
Primary stack: NestJS, Prisma, API contracts, sync behavior

## Role mandate

- Own API contracts and request/response stability.
- Own Prisma schema changes and migration safety.
- Own backend side of offline sync semantics.
- Own CI backend quality gates and test reliability.

## Sprint 1 detailed scope

## B1. Auth lifecycle completion

Files:
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/prisma/schema.prisma`

Deliverables:
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- token expiry and refresh behavior documented

Acceptance:
- valid login returns access and refresh contracts
- expired access token can be refreshed
- invalid/expired refresh is rejected consistently

## B2. Prisma baseline and seed stability

Files:
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `.env.example`

Deliverables:
- stable local DB bootstrap path
- valid seed data with real password hashes
- migration command sequence documented

Acceptance:
- fresh clone -> migrate -> seed succeeds
- seeded users can authenticate with known credentials

## B3. Scheduling skeleton

Files:
- `apps/api/src/app/scheduling/scheduling.service.ts`
- `apps/api/src/app/scheduling/scheduling.controller.ts`
- `apps/api/src/app/scheduling/job-manager.service.ts`
- `apps/api/src/app/scheduling/geo-coding.service.ts`

Deliverables:
- keep existing conflict logic active
- expose scaffold endpoints for agenda/reorder/eta/optimize-route
- return `501` for unimplemented route optimization behavior

Acceptance:
- endpoints are reachable and documented
- TODO markers identify missing dependencies and tests

## B4. Backend test and CI baseline

Files:
- `.github/workflows/ci.yml`
- `apps/api/src/**/*.spec.ts`

Deliverables:
- smoke tests for auth and jobs
- CI runs lint + typecheck + tests (or scoped equivalent)

Acceptance:
- failing test blocks PR merge
- CI logs clearly identify failing project/task

## Sprint 2 detailed scope

## B5. Library and ingestion APIs

Deliverables:
- model/fault/part ingestion endpoint(s)
- search/filter endpoints with pagination
- response DTO consistency

Acceptance:
- ingestion accepts validated Gold schema payload
- search responses are stable across repeated queries

## B6. Service logging and analytics APIs

Deliverables:
- service log CRUD subset for field use
- expense logging endpoint
- analytics aggregation endpoints by period

Acceptance:
- retried sync submissions are idempotent
- analytics totals match sampled raw records

## Sprint 3 detailed scope

## B7. Warranty and commissioning

Deliverables:
- warranty activation/list endpoints
- commissioning value validation logic

Acceptance:
- out-of-range commissioning values are flagged
- warranty records link correctly to jobs/boiler models

## B8. Hardening and staging readiness

Deliverables:
- increased test coverage on critical services
- staging deployment checklist and health verification

Acceptance:
- staging boot, migrate, and health checks are repeatable
- no unresolved critical defects in auth/sync flows

## Handoff contracts

To Frontend:
- stable OpenAPI/DTO docs for auth, jobs, logs, analytics
- explicit sync status/error codes for retry handling

To Data Engineer:
- ingestion schema version and validation errors reference
- batch size and idempotency behavior documented

## Common questions (backend)

Q: Should we block on full route optimization in Sprint 1?  
A: No. Keep conflict detection working and expose skeleton endpoints with `501` for advanced logic.

Q: Should we optimize schema for all future entities now?  
A: No. Add only entities needed for demo flow and next sprint dependencies.

Q: What if API shape changes during sprint?  
A: Version or document contract changes immediately and notify frontend/data the same day.
