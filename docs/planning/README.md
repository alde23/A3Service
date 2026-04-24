# Planning Docs

This folder intentionally contains only the minimum planning docs needed for execution.

## Folder structure

- `overview/`  
  High-level direction and reading order.
- `mappings/`  
  Service/entity mappings to sprints and requirements.
- `sprint-specs/`  
  Sprint-specific implementation and artifact details.
- `roles/`  
  Role-based execution playbooks.

## Source of truth by layer

1. `overview/DOCS_FLOW_LAYERS.md`  
   Layered reading order (high-level to deep implementation detail).
2. `overview/SPRINT_PLAN.md`  
   Overall sprint roadmap, scope, and exit criteria.
3. `overview/SPRINT_PLAN_SRS_ALIGNED.md`  
   Requirement-to-sprint mapping against the SRS.
4. `mappings/SERVICE_REQUIREMENTS_MAP.md`  
   Service-level mapping to sprint scope and SRS requirements.
5. `mappings/ENTITY_LOGIC_SPRINT_MAP.md`  
   Entity-level mapping to sprint scope and required business logic.
6. `overview/DEMO_BOOTSTRAP_PLAN.md`  
   Immediate setup plan for inexperienced developers (auth, Prisma baseline, i18n, SQLite, CI/tests, scheduler skeleton).
7. `sprint-specs/SPRINT_1_SERVICES_SPEC.md`  
   Detailed Sprint 1 service implementation scope and handoffs.
8. `sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`  
   Detailed Sprint 1 artifacts: endpoints, screens, schema/migrations, pipeline outputs, tests.
9. `sprint-specs/SPRINT_2_SERVICES_SPEC.md`  
   Detailed Sprint 2 service implementation scope and handoffs.
10. `sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`  
   Detailed Sprint 2 artifacts: library/logging/analytics API, mobile flows, data contracts, tests.
11. `sprint-specs/SPRINT_3_SERVICES_SPEC.md`  
   Detailed Sprint 3 service implementation scope and handoffs.
12. `sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`  
   Detailed Sprint 3 artifacts: warranty/commissioning/sync hardening, staging readiness, regression outputs.
13. `roles/BACKEND_DEVELOPER_PLAN.md`  
   Backend role-specific playbook and sprint-by-sprint detail.
14. `roles/FRONTEND_DEVELOPER_PLAN.md`  
   Frontend role-specific playbook and sprint-by-sprint detail.
15. `roles/DATA_ENGINEER_PLAN.md`  
   Data engineer role-specific playbook and sprint-by-sprint detail.


## Working rule

If a planning item has no owner, estimate, and acceptance check, it is not actionable and should not stay in these docs.
