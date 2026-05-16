# Backend DB bootstrap and seed (Sprint 1)

This guide documents the Prisma migrate/generate/seed flow for a fresh clone.

## Prereqs

- Node.js 22+ and npm 10+
- A local PostgreSQL instance
- A repo root .env file with the required database URLs

## Required environment variables

Create a .env file at the repo root (c:\A3Service\.env) with:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
```

Notes:
- DATABASE_URL is used by Prisma Client at runtime.
- DIRECT_URL is used by Prisma Migrate.
- Both must be valid URLs or seed/migrate will fail.

## One-time setup (fresh clone)

From the repo root:

1) Install dependencies

```
npm install
```

2) Generate Prisma client

```
npm run prisma:generate
```

3) Apply migrations (dev database)

```
npm run prisma:migrate:dev
```

4) Seed the database

```
npm run prisma:seed
```

## What seed creates

The seed file lives at apps/api/prisma/seed.ts and inserts:
- Users and profiles (manager and technicians)
- Clients and sites
- Jobs with realistic dates
- Service logs (Sprint 2 stub data)
- Sync logs

## Quick verification

After seeding, you should be able to:
- Log in using a seeded user (see apps/api/prisma/seed.ts)
- Query jobs endpoints and see sample data

## Troubleshooting

- If migrate hangs, confirm .env exists and DATABASE_URL is valid.
- If seed fails, ensure DIRECT_URL is set and postgres is reachable.
- If Prisma Client is stale, re-run `npm run prisma:generate`.
