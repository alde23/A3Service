# 🔍 Metro Bundler: Windows & Monorepo Logic

**Project Phase:** `chore/init-monorepo`  
**Associated Commit:** `feat(mobile): resolve metro windows pathing and asset enoent`

This document explains the technical "why" behind our mobile configuration to prevent future regressions on Windows-based development environments.

---

### 1. Windows ESM Protocol Error
**Issue:** `ERR_UNSUPPORTED_ESM_URL_SCHEME` (Received protocol 'c:')

**The Problem:** On Windows, Node's ESM loader (triggered by `"type": "module"` in the workspace) treats drive letters (e.g., `C:`) as URL protocols. It expects absolute paths to be `file:///C:/...`. 

**The Fix:** We maintain `metro.config.js` using CommonJS (`require`) syntax. This forces the use of the legacy CommonJS loader, which handles standard Windows absolute paths without requiring URL schemes.

---

### 2. Asset Resolution (`ENOENT`)
**Issue:** `scandir '...\A3Service\assets\images'` not found.

**The Problem:** Metro defaults its search root to the workspace root. In our Nx structure, it was looking for an `assets` folder at the top level instead of inside `apps/mobile`.

**The Fix:** We explicitly define `projectRoot: __dirname` and manually inject the workspace root into the `watchFolders` array in both the `customConfig` and the `withNxMetro` wrapper. This ensures Metro correctly maps the assets localized to the mobile app.

---

### 3. Missing QR Code (TTY Interception)
**Issue:** The terminal fails to render the QR code grid.

**The Problem:** The `@nx/expo:start` executor wraps the process in a non-interactive shell. This strips the **TTY (Teletype)** signals that the Expo CLI uses to detect a human-facing terminal, causing it to suppress the interactive UI.

**The Fix:** We use the **Expo Dev Tools browser fallback (`d`)** as the primary way to access the QR code while keeping our tasks integrated with the Nx graph.