# 🛠 Vite/Vitest Version Mismatch (api:typecheck Failure)

**Project Phase:** `chore/init-monorepo`
**Associated Commit:** `fix(deps): downgrade vite to v6 to resolve vitest type mismatch" \
-m "Downgraded vite from 8.0.0 to 6.3.5.`

---

### 1. The Issue

**Error Message/Behavior:**
> `vitest.config.mts(5,29): error TS2769: No overload matches this call.`
> `Property 'rolldownVersion' is missing in type 'rollup'.PluginContextMeta but required in type 'rolldown'.PluginContextMeta`

The `nx run api:typecheck` target failed. The other three targets (`shared-schema:build`, `shared-schema:typecheck`, `mobile:typecheck`) passed.

**The Problem:**

A dependency version mismatch between `vite` and `vitest` in the root `package.json`.

- `vite@^8.0.0` was specified, which ships with **Rolldown** as its internal bundler (replacing Rollup).
- `vitest@~4.0.8` bundles its own internal copy of Vite (pre-Rolldown), and its plugin types still reference **Rollup's** `PluginContextMeta`.
- The top-level `vite@8` `Plugin<any>` type (Rolldown-based) was not assignable to the `PluginOption` type that Vitest's bundled Vite (Rollup-based) expected.
- TypeScript caught the structural mismatch at `vitest.config.mts` line 5 where the config function (returning `Plugin<any>[]`) is passed into `defineConfig`.

This is not a Windows-specific issue — it would fail on any OS with this version combination.

---

### 2. The Resolution

**The Fix:**

Downgraded `vite` from `^8.0.0` to `^6.3.5` in the root `package.json`. Vitest 4.x is tested against Vite 6.x. The Rolldown-based plugin types in Vite 8 are incompatible with Vitest's internal Rollup-based Vite copy.

```bash
npm install --save-dev vite@^6.3.5
```

Then cleared the Nx cache to ensure no stale typecheck results were served:

```bash
npx nx reset
npx nx run-many -t typecheck --all
```

**Verification:**

Run the following and confirm all 4 targets show `✓`:

```bash
npx nx run-many -t typecheck --all
```

Expected output:
```
✓  nx run shared-schema:build
✓  nx run shared-schema:typecheck
✓  nx run mobile:typecheck
✓  nx run api:typecheck
```

---

### 3. Special Instructions

Other devs picking up this branch need to:

- [ ] Run `npm install` — the `package-lock.json` has been updated with the pinned Vite version
- [ ] If they see stale typecheck errors, run `npx nx reset` then retry

> **Note for future upgrades:** Do not upgrade `vite` past `^6.x` until Vitest officially supports Vite 8 / Rolldown. Track this at: https://github.com/vitest-dev/vitest/issues