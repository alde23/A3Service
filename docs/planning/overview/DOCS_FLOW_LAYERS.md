# Planning Docs Flow (Layered)

Last updated: 2026-04-24  
Purpose: define the reading order so junior developers move from context to implementation without confusion.

## Layer 0: Orientation

Question answered: "What should I read first?"

- `../README.md`

Output:
- clear navigation path

## Layer 1: Product and sprint direction

Questions answered:
- "What are we building this sprint?"
- "What is in/out of scope?"

Read:
- `SPRINT_PLAN.md`
- `SPRINT_PLAN_SRS_ALIGNED.md`

Output:
- sprint goals and requirement mapping understood

## Layer 2: Domain and architecture mapping

Questions answered:
- "Which services/entities exist and when are they built?"
- "Which requirement maps to which technical area?"

Read:
- `../mappings/SERVICE_REQUIREMENTS_MAP.md`
- `../mappings/ENTITY_LOGIC_SPRINT_MAP.md`

Output:
- ownership and domain boundaries understood

## Layer 3: Sprint-specific implementation specs

Questions answered:
- "Exactly what do I implement this sprint?"
- "What is deferred?"

Read:
- `../sprint-specs/SPRINT_1_SERVICES_SPEC.md`
- `../sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`
- `../sprint-specs/SPRINT_2_SERVICES_SPEC.md`
- `../sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`
- `../sprint-specs/SPRINT_3_SERVICES_SPEC.md`
- `../sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`
- `DEMO_BOOTSTRAP_PLAN.md`

Output:
- concrete sprint implementation scope understood

## Layer 4: Role execution playbooks

Questions answered:
- "What is my role responsible for today?"
- "What do I hand off to others?"

Read:
- `../roles/BACKEND_DEVELOPER_PLAN.md`
- `../roles/FRONTEND_DEVELOPER_PLAN.md`
- `../roles/DATA_ENGINEER_PLAN.md`

Output:
- role-level tasks, handoffs, and acceptance criteria understood

## Layer 5: Ticket/task execution

Questions answered:
- "What do I code right now?"
- "How do I know I'm done?"

Source:
- issue tracker / board tasks created from Layer 3 and Layer 4 docs

Output:
- implementation, tests, and review evidence

## Role-based quick reading paths

Backend:
1. `../README.md`
2. `SPRINT_PLAN.md`
3. `../mappings/SERVICE_REQUIREMENTS_MAP.md`
4. `../mappings/ENTITY_LOGIC_SPRINT_MAP.md`
5. `../sprint-specs/SPRINT_1_SERVICES_SPEC.md`
6. `../sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`
7. `../sprint-specs/SPRINT_2_SERVICES_SPEC.md`
8. `../sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`
9. `../sprint-specs/SPRINT_3_SERVICES_SPEC.md`
10. `../sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`
11. `../roles/BACKEND_DEVELOPER_PLAN.md`

Frontend:
1. `../README.md`
2. `SPRINT_PLAN.md`
3. `../mappings/SERVICE_REQUIREMENTS_MAP.md`
4. `../mappings/ENTITY_LOGIC_SPRINT_MAP.md`
5. `../sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`
6. `../sprint-specs/SPRINT_1_SERVICES_SPEC.md`
7. `../sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`
8. `../sprint-specs/SPRINT_2_SERVICES_SPEC.md`
9. `../sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`
10. `../sprint-specs/SPRINT_3_SERVICES_SPEC.md`
11. `../roles/FRONTEND_DEVELOPER_PLAN.md`

Data Engineer:
1. `../README.md`
2. `SPRINT_PLAN.md`
3. `SPRINT_PLAN_SRS_ALIGNED.md`
4. `../mappings/ENTITY_LOGIC_SPRINT_MAP.md`
5. `../sprint-specs/SPRINT_1_SERVICES_SPEC.md`
6. `../sprint-specs/SPRINT_1_ARTIFACTS_SPEC.md`
7. `../sprint-specs/SPRINT_2_SERVICES_SPEC.md`
8. `../sprint-specs/SPRINT_2_ARTIFACTS_SPEC.md`
9. `../sprint-specs/SPRINT_3_SERVICES_SPEC.md`
10. `../sprint-specs/SPRINT_3_ARTIFACTS_SPEC.md`
11. `../roles/DATA_ENGINEER_PLAN.md`
