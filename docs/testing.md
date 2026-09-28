# Testing

## How to run
```powershell
docker compose up -d db_test
npm test               # 7 files, 64 tests
npm run test:coverage  # text summary + HTML report in coverage/
npm run build; npm run test:e2e   # Playwright, starts a fake TMDB and the app on port 3100
```
CI runs lint, typecheck, `test:coverage` and build on every push and pull request against a Postgres 18.6 service container.

## What is tested
| Area | File | Examples |
|---|---|---|
| Database rules | `integration/db-constraints.test.ts` | one rating per user/movie, rating 1-10 CHECK, unique tmdb_id, cascades, append-only audit trigger |
| Business rules | `integration/services.test.ts` | idempotent add with one audit row, remove + 404, cross-user isolation, no writes when TMDB is down, rating create/update, concurrent upsert gives one row, audit rolled back with failed change, own-activity only |
| API | `integration/api.test.ts` | 401 on every protected route, 403 cross-site, 201/200/204/404 codes, 422 for invalid ids and bodies (incl. unknown `userId` field), 400 malformed JSON, activity has no write methods, AI fallback + audit |
| Auth audit | `integration/auth-audit.test.ts` | sign-up, failed sign-in (no user id, no email), sign-in, sign-out through Better Auth's real handler; no audit for sign-out without session |
| TMDB adapter | `unit/tmdb.test.ts` | parsing, malformed items dropped, director-only credits, 429/500/404 mapping, network error, bad JSON, director lookup for people known for acting |
| AI | `unit/ai-search.test.ts` | validation, normalisation, all fallback reasons, injection-like output |
| End-to-end | `e2e/journey.spec.ts` (Playwright) | desktop + mobile: logged-out redirect; sign up, search by director + genre, add, rate, collection, AI fallback, activity, sign out; password never in the URL |
| Audit helpers | `unit/audit.test.ts` | secrets/emails stripped from details, IP and user-agent handling |

External services are always mocked: TMDB with `vi.mock` / stubbed `fetch`, the AI provider with a fake `fetch`. Integration tests use a real, separate test database (a guard refuses to run against a non-test database).

## Coverage (2026-09-26, `npm run test:coverage`)
Overall: 82.8% statements, 75.4% branches, 84.1% lines. `ratings.ts`, `activity.ts`, `errors.ts` 100%; `collection.ts` 94%; `ai-search.ts` 98%; `http.ts` 93%; `tmdb.ts` 82%; `movies.ts` 79%.

## Gaps (known and accepted)
- React pages and components are excluded from unit coverage; they are exercised by the Playwright journey and were checked manually in the browser.
- The E2E test uses a fake TMDB and no AI key, so it covers the fallback path, not the live AI.
- `session.ts` and `db/index.ts` are replaced by mocks in tests, so they show 0%; the real session path is covered by the auth-audit test and by manual checks.
- Thin route handlers for genres, movie details and the collection list have no dedicated tests; their services are tested.
- `movies.ts` `getMovieWithUserState` (details page join) is only checked manually.
- Rate limiting (5/min) was verified manually with curl, not in automated tests, because the limiter's in-memory state would make tests order-dependent.
- The real TMDB and Gemini APIs are not called in CI (by design); they were checked manually on the developer machine and the live deployment.
