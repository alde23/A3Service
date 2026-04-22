# A3Service (Nx + Expo + Nest)

This repo is an Nx (v22) monorepo containing:

- `mobile` (Expo SDK 54 app)
- `api` (NestJS 11 API)
- `shared-schema` (TypeScript contract library shared by both)

## Prereqs

- Node.js 22+ (recommended)
- npm 10+
- Expo Go installed on your phone (for quick device testing)

## Install

```sh
npm install
```

## Backend (NestJS)

Build then run the compiled output:

```sh
npx nx build api
node dist/apps/api/main.js
```

The API should start at `http://localhost:3000/api`.

## Frontend (Expo Go)

Start Metro via Nx:

```sh
npx nx start mobile
```

Then:

- open Expo Go on your phone
- scan the QR code shown in the terminal

Note: In an Nx monorepo, `expo-doctor` may warn about Metro `projectRoot` being the workspace root. Nx intentionally sets this for SDK 54+ monorepo module resolution.

## Tests

```sh
npx nx test api
npx nx test mobile
```

(`shared-schema` currently has no `test` target.)

## Useful Nx commands

```sh
npx nx show projects
npx nx graph
npx nx reset
```
