# 🛠 Mobile Monorepo Bundling Fixes After Branch Merge

**Project Phase:** `chore/init-monorepo`
**Associated Commit:** `fix(mobile): resolve expo-router monorepo bundling issues`

---

### 1. Empty `app.json`

**Error Message/Behavior:**
> `EmptyJsonFileError: Cannot parse an empty JSON string`
> `File: C:\Users\...\A3Service\apps\mobile\app.json`

**The Problem:**
The manual branch merge wiped the contents of `apps/mobile/app.json`, leaving it as a 0-byte file. Expo CLI cannot start without a valid config.

---

**The Fix:**
- Recreated `apps/mobile/app.json` with correct Expo config.
- Removed deprecated `"entryPoint": "expo-router/entry"` field.
- Fixed `expo-router` plugin `root` path from absolute `"apps/mobile/src/app"` to relative `"src/app"` — since `app.json` is already inside `apps/mobile/`, the path must be relative to it.

**Verification:**
Run `npx expo start` from `apps/mobile`. The `EmptyJsonFileError` should not appear.

---

### 2. Broken `apps/api/project.json` Structure

**Error Message/Behavior:**
> Nx could not parse `project.json` for the `api` project. Build target would fail silently or with unexpected errors.

**The Problem:**
During the merge, the `test` target was accidentally nested inside the `build` target's `options` block instead of being a sibling target. This is a silent JSON structural error — the file parses, but the targets are wrong.

---

**The Fix:**
Moved the `test` target out of `build.options` and made it a top-level sibling inside `targets`:

```json
"targets": {
  "build": { ... },
  "test": { ... },  // ✅ sibling, not nested
  "serve": { ... }
}
```

**Verification:**
Run `npx nx test api` — it should find and run the test target correctly.

---

### 3. Stray Comment in `tsconfig.base.json`

**Error Message/Behavior:**
> Silent parse failures in strict JSON tools and potential TypeScript config errors.

**The Problem:**
A merge conflict resolution left a JavaScript-style comment (`/* DELETE THE baseUrl LINE ENTIRELY */`) inside `tsconfig.base.json`. JSON does not support comments and this will cause parse errors in any strict JSON parser.

---

**The Fix:**
Removed the comment entirely from `tsconfig.base.json`.

**Verification:**
Run `npx tsc --noEmit` from the repo root. No JSON parse errors should appear.

---

### 4. Dependency Version Mismatches

**Error Message/Behavior:**
> `npx expo-doctor` reporting version mismatches and peer dependency failures.

**The Problem:**
Several dependencies had incorrect versions after the merge, either from accidental bumps or conflicting branch states:
- `jest` was `^30.0.2` — Expo SDK 54 requires `~29.7.0`
- `babel-jest`, `jest-environment-jsdom`, `jest-util` were also on v30
- `@types/jest` was `^30.0.0`
- `expo-constants` and `expo-linking` were missing entirely — required peer deps of `expo-router`
- `expo-router ~6.0.11` resolves to `6.0.23` which requires `expo-constants ~18.0.13` and `expo-linking ~8.0.11` — not the older versions initially added

---

**The Fix:**
- Downgraded `jest` and related packages to `~29.7.0`
- Added `expo-constants: ~18.0.13` and `expo-linking: ~8.0.11` to root `package.json` dependencies
- Added both to `apps/mobile/package.json` as `"*"` to defer to root versions
- Pinned `expo-router` to `6.0.23` explicitly to avoid range resolution surprises

**Verification:**
Run `npx expo-doctor` — should return 17/17 checks passed.

---

### 5. Metro Resolving Assets from Workspace Root

**Error Message/Behavior:**
> `ENOENT: no such file or directory, scandir 'C:\Users\...\A3Service\assets\images'`

**The Problem:**
Metro was looking for assets at the workspace root (`A3Service/assets/images`) instead of the app directory (`A3Service/apps/mobile/assets/images`). This was caused by `withNxMetro` from `@nx/expo` internally overriding `projectRoot` back to the workspace root, regardless of what was explicitly passed to it.

---

**The Fix:**
- Removed `withNxMetro` entirely from `apps/mobile/metro.config.cjs`
- Switched to Expo's built-in monorepo support by adding `"workspaces": ["apps/*"]` to root `package.json`
- Expo auto-detects the monorepo via workspaces and configures Metro correctly without manual overrides

**Verification:**
Start the app and confirm no `ENOENT assets` errors appear in the terminal.

---

### 6. `expo-router/entry` Resolution Failure (Known Nx Bug)

**Error Message/Behavior:**
> `Unable to resolve module ./node_modules/expo-router/entry from C:\...\apps\mobile\.:`

**The Problem:**
This is a known bug in `@nx/expo`'s Metro resolver (`node_modules/@nx/expo/plugins/metro-resolver.js`). The pnpm resolver inside it hardcodes the workspace root for module lookups and returns `expo-router/entry` as a relative path (`./node_modules/expo-router/entry`) instead of an absolute one. Since there is no local `node_modules` inside `apps/mobile`, this path does not exist and resolution fails.

The bug is not fixed by the Nx team as of April 2026.

---

**The Fix:**
- Removed `withNxMetro` (already done in fix #5) — this also removes the broken Nx resolver
- Expo's native monorepo support (via workspaces) handles resolution correctly without Nx's resolver
- Set `EXPO_ROUTER_APP_ROOT=src/app` environment variable when starting so expo-router knows where routes are

**Verification:**
Start with the commands in Special Instructions below. The app should bundle and load without the `./node_modules/expo-router/entry` error.

---

### 7. Test File Inside Route Directory

**Error Message/Behavior:**
> `The package at "node_modules\@testing-library\react-native\build\helpers\logger.js" attempted to import the Node standard library module "console".`

**The Problem:**
`App.spec.tsx` was located inside `apps/mobile/src/app/`, which is the directory expo-router scans with `require.context` to discover routes. This caused the test file — and its import of `@testing-library/react-native` — to be included in the app bundle. `@testing-library/react-native` imports Node.js built-ins (`console`, `util`) that do not exist in the React Native runtime.

---

**The Fix:**
Moved `App.spec.tsx` from `apps/mobile/src/app/` to `apps/mobile/src/`.

> ⚠️ Going forward: **never place `.spec.tsx` or `.test.tsx` files inside `src/app/`**. Expo Router treats every file in that directory as a route or layout. Test files belong in `src/` or a dedicated `__tests__/` folder.

**Verification:**
Start the app and confirm no `console` or Node standard library import errors appear.

---

### Special Instructions

After pulling this branch, all devs must:

- [ ] Run `npm install` from the repo root — dependency tree has changed significantly
- [ ] Use the following commands to start the mobile app (until the Nx executor is fixed):

**PowerShell:**
```powershell
cd apps/mobile
$env:EXPO_ROUTER_APP_ROOT="src/app"
npx expo start --port 8081 --clear
```

**Bash/zsh:**
```bash
cd apps/mobile
export EXPO_ROUTER_APP_ROOT="src/app"
npx expo start --port 8081 --clear
```

- [ ] Do **not** use `npx nx start mobile` from the repo root until the Nx executor env var issue is resolved (tracked separately)
