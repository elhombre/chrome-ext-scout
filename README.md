# Chrome Extension Scout

Chrome Extension Scout is an analytics application for discovering promising niches in the Chrome Web Store.

It helps product teams answer a practical question:

Where is demand high, quality relatively weak, and competition still manageable?

## AI-Driven Development

This project was fully designed and implemented using AI-assisted development workflows, with human steering for product decisions, prioritization, and acceptance criteria.

## Why This Project Exists

The Chrome Web Store is large and noisy. Manual niche discovery is slow and subjective.
This project provides a structured workflow backed by data:

1. Start from market-level category signals.
2. Drill down to extension-level distributions inside a category.
3. Produce a ranked opportunity shortlist using a transparent scoring model.

## MVP Goals

- Build a usable internal analytics cockpit.
- Keep formulas transparent and easy to inspect.
- Preserve compatibility with an existing PostgreSQL schema and data.
- Support both English and Russian UI.

## What Is Included in MVP

- `Home` page with navigation, system notes, and scoring model entry point.
- `Market` page:
  - Category-level ranking and charts
  - Global filters
  - Drill-down into category explorer
- `Category Explorer` page:
  - Scatter/histogram charts
  - Extension table with sorting and pagination
  - Direct links to Chrome Web Store extension pages
- `Opportunities` page:
  - Ranked opportunity table
  - Bubble map visualization
  - Shared filters and pagination behavior
- `Scoring Model` page:
  - Formula and factor definitions
  - Calibration constants used in SQL pipeline
- i18n:
  - English and Russian
  - Language switch persisted in local storage
- Theme:
  - Light / Night / Auto
  - Theme switch persisted in local storage

## Tech Stack

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Kysely + `pg`
- ECharts
- Tailwind CSS + shadcn/ui
- Biome (lint/format)

## Scoring Model (MVP)

Final score:

```text
score = 100 * (0.45 * demand_norm + 0.35 * gap_effective + 0.20 * (1 - competition_norm))
```

Where:

- `demand_norm`: log-normalized users (clamped to `0..1`)
- `gap_effective`: quality gap weighted by confidence
- `competition_norm`: log-normalized category competition (clamped to `0..1`)

Constants are available in:

- `src/lib/opportunities/constants.ts`

## Prerequisites

- Node.js `>= 20`
- Yarn `>= 4`
- PostgreSQL with the required dataset/schema

## Environment Variables

Create `.env` from `.env.example`:

```bash
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=chrome_ext_scout
PG_SSL=false
NEXT_PUBLIC_DB_LAST_UPDATED_AT=YYYY-MM-DD
```

Notes:

- `NEXT_PUBLIC_DB_LAST_UPDATED_AT` is optional.
- Date must be in `YYYY-MM-DD`; UI renders it in locale-specific format.

## Local Development

1. Install dependencies:

```bash
yarn install
```

2. Verify DB connection:

```bash
yarn db:check
```

3. Start the app:

```bash
yarn dev
```

4. Open:

- `http://localhost:3000`

## Available Scripts

- `yarn dev` - start dev server
- `yarn build` - production build
- `yarn start` - run production server
- `yarn lint` - Biome checks
- `yarn format` - Biome auto-fix
- `yarn db:check` - CLI PostgreSQL connection smoke test

## Deployment (Vercel)

This app can be deployed to Vercel, but the database must be reachable from Vercel infrastructure.

If your DB is local/LAN-only (for example `192.168.x.x`), Vercel cannot access it.
Use a publicly reachable managed PostgreSQL instance with SSL enabled.

Set all required environment variables in the Vercel project settings.

## Project Structure

```text
src/
  app/                 # Next.js routes and pages
  components/          # UI building blocks
  lib/                 # data access, filters, domain logic, i18n
  locales/             # EN/RU translation JSON files
scripts/
  db-check.mjs         # database connectivity smoke check
docs/
  database-schema.md   # existing DB schema reference
```

## GitHub Workflow

- CI runs on push/PR to `main`:
  - install
  - lint
  - build
- Issue templates are included for:
  - bug reports
  - feature requests
- PR template is included.

## Contributing

Please read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## License

MIT - see `LICENSE`.
