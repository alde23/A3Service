# 🛠 Mobile Home Map Screen Setup

**Project Phase:** `mobile/ui-home-map`
**Associated Commit:** `feat(mobile): add maps-based Home UI and install react-native-maps`

---

### ### 1. The Issue
**Error Message/Behavior:**
> The Home screen imports `MapView` from `react-native-maps`, but the native maps package was not installed, causing runtime/module resolution failures when opening the screen.

**The Problem:**
The new Home UI implementation depends on `react-native-maps` and Google provider support on Android. The dependency was missing from the workspace dependencies/lockfile, so the app could not reliably render the map screen.

---

### ### 2. The Resolution
**The Fix:**
* Installed the Expo-compatible maps package using `npx expo install react-native-maps`.
* Updated workspace dependency state in `package.json` and `package-lock.json` with `react-native-maps`.
* Kept the Home screen (`apps/mobile/src/app/home.tsx`) on `react-native-maps` components (`MapView`, `Marker`, `Polyline`) so the UI renders with the installed native module.

**Verification:**
Run `cd apps/mobile` then `npx expo start --clear`, open the app, and navigate to Home:
* Map loads without import/module errors.
* Markers and route polyline render.
* Android uses Google provider via `PROVIDER_GOOGLE`.

---

### ### 3. Special Instructions (Optional)
Does this fix require a manual step from other devs?
* [x] "Run `npm install`"
* [ ] "Update your `.env` with the new `DATABASE_URL`"
* [ ] "Restart the TS Server in VS Code"