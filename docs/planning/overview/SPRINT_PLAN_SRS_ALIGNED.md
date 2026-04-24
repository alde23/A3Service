# Sprint Plan (SRS Aligned)

Last updated: 2026-04-24  
Reference: `docs/context/SRS_A3Service.pdf`

This file maps requirements to sprint delivery targets.  
Execution detail is in `DEMO_BOOTSTRAP_PLAN.md` and `SPRINT_PLAN.md`.
Layered reading flow is in `DOCS_FLOW_LAYERS.md`.
Service/entity detail is in `../mappings/SERVICE_REQUIREMENTS_MAP.md`, `../mappings/ENTITY_LOGIC_SPRINT_MAP.md`, `../sprint-specs/SPRINT_1_SERVICES_SPEC.md`, `../sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`, `../sprint-specs/SPRINT_2_SERVICES_SPEC.md`, `../sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`, `../sprint-specs/SPRINT_3_SERVICES_SPEC.md`, and `../sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`.

## Functional requirements mapping

| SRS Area | Requirement Group | Planned Sprint | Planned Evidence |
|---|---|---|---|
| Auth/Profile | FR-01 to FR-05 | Sprint 1 | auth endpoints + mobile auth flow + test coverage |
| Scheduling/Field Ops | FR-07 to FR-12 | Sprint 1 | jobs + scheduling APIs, offline cache, status flow demo |
| Technical Library | FR-14 to FR-16 | Sprint 2 | ingestion + search endpoints + mobile offline library |
| Service Logging | FR-17 to FR-18 | Sprint 2 | service log model/API + client history view |
| Analytics | FR-19 to FR-23 | Sprint 2 | dashboard metrics + expense flow + sync checks |
| Warranty | FR-24 to FR-26 | Sprint 3 | warranty endpoints + commissioning validations |

## Non-functional requirements mapping

| NFR Theme | Target Sprint | Validation Approach |
|---|---|---|
| Offline-first behavior | Sprint 1-2 | airplane mode workflow checks + queued sync verification |
| Sync integrity | Sprint 1-2 | idempotency tests + conflict scenario test cases |
| Security/auth | Sprint 1 | token lifecycle tests + guard checks |
| Performance baseline | Sprint 2-3 | API latency spot checks + mobile search/render timing |
| Reliability/testing | Sprint 3 | CI quality gate + regression suite + coverage target |
| Localization/accessibility | Sprint 1-3 | language toggle checks + high-contrast/mobile ergonomics checks |

## Conditional or deferred items

- Complex route optimization heuristics are deferred after Sprint 1 skeleton.
- Full fuzzy search and broad PDF extraction accuracy tuning continue after Sprint 2 baseline.
- Advanced operations/production hardening beyond staging is deferred after Sprint 3.

## Tracking rule

A mapped requirement is considered delivered only when:

1. implementation is merged
2. acceptance check is recorded
3. test evidence or manual QA evidence is linked
