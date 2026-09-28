# MovieShelf

Search movies by director and genre (TMDB), keep a personal collection, rate films 1-10 and see a read-only log of your own activity. Includes an AI natural-language search ("scary movies by Jordan Peele") with a non-AI fallback.

- **Live demo:** https://movieshelf-rho.vercel.app (Vercel + Neon Postgres)
- **Demo account:** `demo@example.com` / `correct-horse-9`

## Stack

Next.js 16 (App Router, TypeScript) - PostgreSQL 18 - Drizzle ORM - Better Auth (email + password) - Zod - Tailwind CSS - Vitest - GitHub Actions. Modular monolith: `src/app` (pages + route handlers), `src/server` (business logic, TMDB and AI adapters, audit), `src/db` (schema, migrations).

## Run locally (Windows PowerShell)

Requirements: Node 24 (`.nvmrc`), Docker Desktop.

```powershell
git clone https://github.com/Josan-Williams/movieshelf.git; cd movieshelf
Copy-Item .env.example .env    # then fill in passwords, BETTER_AUTH_SECRET and TMDB_API_READ_TOKEN
docker compose up -d           # dev db on 127.0.0.1:5432, test db on 127.0.0.1:5433
npm ci
npm run db:migrate
npm run db:seed                # genres (then sign up demo@example.com in the UI)
npm run dev                    # http://localhost:3000
```

`AI_API_KEY` is optional; without it the AI search uses the rule-based fallback and says so in the UI.

## Tests

```powershell
npm test               # unit + integration (uses the db_test container; TMDB and AI are mocked)
npm run test:coverage
npm run lint; npm run typecheck; npm run build
npx playwright install chromium   # once
npm run build; npm run test:e2e   # browser journey on desktop + mobile viewports (fake TMDB, test DB)
```

CI (GitHub Actions) runs lint, typecheck, unit/integration tests with coverage and the build, then the Playwright E2E journey. On `main`, production is deployed to Vercel only after both jobs pass.

## API

All routes require a session cookie (401 otherwise). Errors: `{ "error": { "code", "message", "fields?" } }`.

| Method | Path | Result |
|---|---|---|
| GET | `/api/movies/search?director=&genre=&page=` | 200 results / 422 neither given |
| GET | `/api/movies/{tmdbId}` | 200 details + your rating / 404 |
| GET | `/api/genres` | 200 |
| GET | `/api/collection` | 200 |
| PUT | `/api/collection/{tmdbId}` | 201 added / 200 already there |
| DELETE | `/api/collection/{tmdbId}` | 204 / 404 not in your collection |
| PUT | `/api/ratings/{tmdbId}` body `{ rating: 1-10, review? }` | 201 created / 200 updated / 422 |
| GET | `/api/activity?page=` | 200 (read-only; other methods 405) |
| POST | `/api/ai/search` body `{ query }` (max 200 chars) | 200 with `source: "ai" \| "fallback"` |
| * | `/api/auth/*` | Better Auth (sign-up, sign-in, sign-out, session) |

## Deployment

Hosted on Vercel (Node 24) with a Neon Postgres database. To deploy your own: create a Neon project, run `npm run db:migrate` and `npm run db:seed` with `DATABASE_URL` pointing at it, import the repo into Vercel, set `DATABASE_URL`, `BETTER_AUTH_SECRET` (new value), `BETTER_AUTH_URL` (the production URL), `TMDB_API_READ_TOKEN` and optionally `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`, then deploy.

## Security summary

Passwords hashed by Better Auth (scrypt); HttpOnly SameSite=Lax session cookies (Secure in production); sign-in/sign-up limited to 5 per minute; identical errors for wrong password and unknown email; user identity taken only from the session; strict request schemas (unknown fields rejected); cross-origin mutations blocked; parameterised queries via Drizzle; append-only audit log enforced by a database trigger; security headers; secrets only in environment variables.

Known limitations: rate-limited (429) sign-in attempts are not audited; client IPs in the audit log are only trustworthy behind Vercel's proxy; duplicate sign-up reveals that an email is registered; no email verification or password reset; the rate-limit store is in memory per serverless instance.

## Documentation

- `docs/decisions.md` - design decisions DEC-001 to DEC-008
- `docs/ai-disclosure.md` - how AI tools were used, with accepted/corrected/rejected suggestions
- `docs/ai-feature.md` - AI search: provider, model, prompt, fallback, cost, limits
- `docs/testing.md` - what is tested, coverage and known gaps
- `docs/erd.png` - database diagram

Movie data from [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
