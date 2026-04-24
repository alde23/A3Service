# Frontend Developer Playbook

Last updated: 2026-04-24  
Primary stack: Expo/React Native, offline cache, i18n, UX reliability

## Role mandate

- Own mobile flow usability for field technicians.
- Own language/localization implementation and consistency.
- Own offline-first local persistence and queue UX.
- Own frontend test scenarios for regression-prone paths.

## Sprint 1 detailed scope

## F1. Auth and guarded navigation

Files:
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/services/auth.service.ts`

Deliverables:
- login/logout flow wired to backend auth contract
- guarded routes for unauthenticated users
- persisted auth state across restarts

Acceptance:
- valid login lands user in app tabs
- invalid token routes user back to login

## F2. i18n baseline

Files:
- `apps/mobile/src/i18n/index.ts`
- `apps/mobile/src/i18n/locales/bs.json`
- `apps/mobile/src/i18n/locales/en.json`

Deliverables:
- Bosnian default and English switch
- all core tab labels and primary actions translated

Acceptance:
- language toggle updates UI immediately
- selected language persists after restart

## F3. Styling foundation

Files:
- `apps/mobile/src/theme/*`
- `apps/mobile/src/app/*.tsx`

Deliverables:
- one shared token system for colors, spacing, and typography
- status colors standardized across screens

Acceptance:
- new screens can use shared tokens without ad-hoc styling
- contrast/readability acceptable in low-light conditions

## F4. SQLite cache and queue foundation

Files:
- `apps/mobile/src/storage/sqlite.ts`
- `apps/mobile/src/storage/jobs.repository.ts`
- `apps/mobile/src/storage/sync-queue.repository.ts`

Deliverables:
- local tables for cached jobs and pending sync items
- read/write repo methods for basic offline flow

Acceptance:
- cached jobs load in offline mode
- queued writes survive app restart

## Sprint 2 detailed scope

## F5. Technical library UI

Deliverables:
- searchable library screen with filters
- fault/model/part detail views
- offline search using local cache

Acceptance:
- search and filter work with network disabled
- navigation across result types is stable

## F6. Service log and analytics UI

Deliverables:
- service log form for faults, parts, labor, notes
- analytics dashboard with period selectors
- expense entry flow

Acceptance:
- calculations match backend/source records for sampled cases
- offline-created logs remain visible and queued for sync

## Sprint 3 detailed scope

## F7. Warranty UX and reliability hardening

Deliverables:
- warranty-related user flow screens/states
- robust error and retry UX for sync and auth expiration
- regression checklist for core flows

Acceptance:
- no blockers in login, jobs, library, analytics, warranty baseline paths
- sync failure paths always show clear next action

## Handoff contracts

To Backend:
- report DTO mismatches with exact endpoint + payload examples
- provide failing scenario repro steps when contract issues occur

To Data Engineer:
- identify fields required by UI that are missing in dataset
- provide examples where data quality blocks rendering/search UX

## Common questions (frontend)

Q: Should we build full visual polish before offline basics?  
A: No. Offline cache and sync visibility come first, polish later.

Q: Can we keep using hardcoded text while coding fast?  
A: No for primary flows. All main labels/actions should use i18n keys from Sprint 1.

Q: What if backend endpoint is not ready?  
A: Use adapter/service abstraction and mock data temporarily, then swap integration when API is ready.
