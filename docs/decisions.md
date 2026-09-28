# MovieShelf – Decision Log

Each entry records a significant technical decision, the options considered and the reasoning, so it can be explained during the assessment discussion.

---

## DEC-001 – One personal collection per user (named collections dropped)

- **Date:** 2026-09-23
- **Status:** Accepted
- **Rubric areas:** Data & backend, Working solution, Code quality

### Context
The specification says a user must be able to *"add and remove movies from a personal collection"*. An earlier draft schema (produced by ChatGPT (chatgpt.com)) modelled **named collections**: a `collections` table (`collection_id`, `user_id`, `collection_name`) plus a `collection_movies` join table, allowing a user to create several collections such as "Favourites" or "Watch Later".

### Options considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| A. Single personal collection | `collection_items(user_id, movie_id, added_at)`, composite PK `(user_id, movie_id)` | Matches the spec exactly; one table; duplicates impossible via PK; every query scoped by `user_id` from the session; no collection IDs in URLs | Users cannot organise movies into separate lists |
| B. Named collections | `collections` + `collection_movies` | Richer feature | Not required; needs `UNIQUE (user_id, collection_name)`; needs an ownership check on every collection request to prevent IDOR (changing `collection_id` in the URL); more UI, validation and tests |

### Decision
**Option A – one personal collection per user.**

### Reasons
1. It satisfies the requirement as written, without adding unrequested scope.
2. It removes an entire class of authorization bug. The API never receives a collection ID, so a user cannot target another user's collection by editing a URL. Ownership is enforced by always using the authenticated user's ID from the session.
3. Duplicate prevention is enforced by the database through the composite primary key `(user_id, movie_id)`.
4. Less code and fewer tests are needed, which reduces risk within the one-week assessment window.

### Trade-offs
- Users cannot group movies into multiple lists.
- Accepted because the spec does not ask for it, and time is better spent on testing, security and accessibility.

### Consequences
- **Schema:** `collection_items` table only; no `collections` or `collection_movies` tables.
- **API:** `GET /api/collection`, `PUT /api/collection/:tmdbId`, `DELETE /api/collection/:tmdbId` – no collection identifier in any route.
- **Tests:** duplicate add is rejected/idempotent; remove works; user B cannot see or change user A's collection.
- **Ratings** remain independent of the collection (see assumptions), so removing a movie does not delete its rating.

### How this could be reversed later
Add a `collections` table with `UNIQUE (user_id, collection_name)`, replace `collection_items.user_id` with `collection_id`, migrate existing rows into a default "My Collection" per user, and add an ownership check plus cross-user tests for every collection route.

### AI involvement
The named-collections design came from a ChatGPT (chatgpt.com) schema suggestion. It was reviewed against the specification and rejected in favour of the simpler design above. Recorded as an AI-assistance example in `ai-disclosure.md`.

---

## DEC-002 – Use Better Auth's `user` table as the single identity table

- **Date:** 2026-09-23
- **Status:** Accepted
- **Rubric areas:** Data & backend, Code quality

### Context
Better Auth creates and manages its own `user` table (plus `session`, `account`, `verification`). The developer considered renaming the application's user concept to `person` to avoid a perceived conflict.

### Options considered

| Option | Description | Trade-off |
|---|---|---|
| A. Keep Better Auth's `user` | App tables reference `user.id` directly | Zero extra work; `user` is a reserved word in raw SQL and must be quoted (`"user"`), which Drizzle does automatically |
| B. Rename Better Auth's table via config | Still one table, different name | Cosmetic only; config and Drizzle schema must stay in sync |
| C. Separate `person` table (1:1 with `user`) | App-owned profile table | Two tables for one entity → duplication, sync problems, normalization concerns; only justified by app-specific profile data the spec doesn't require |

### Decision
**Option A – keep Better Auth's `user` table.**

### Reasons
1. One real-world entity → one table (no duplicated identity data).
2. Better Auth owns authentication data, including password hashes (stored in its `account` table), so the app never handles raw credentials.
3. `collection_items.user_id`, `ratings.user_id` and `audit_logs.user_id` all reference `user.id`.

### Trade-offs
- `user` must be quoted in hand-written SQL.
- Schema for the `user` table is shaped by Better Auth; changes follow its conventions.

---

## DEC-003 – Separate Docker Compose services for development and test databases

- **Date:** 2026-09-24
- **Status:** Accepted
- **Rubric areas:** Testing, CI & documentation

### Context
Automated tests insert and delete rows and reset tables between tests. Running them against the development database would wipe development data. Two local databases are needed.

### Options considered

| Option | Description | Trade-off |
|---|---|---|
| A. One container, two databases | One Postgres service; an init script in `docker-entrypoint-initdb.d` creates the test database | Fewer resources; init script only runs on an empty volume (easy to miss) |
| B. Two containers | `db` (dev, port 5432) and `db_test` (test, port 5433), same pinned image | Slightly more resources; risk of confusing ports |

### Decision
**Option B – two separate services.**

### Reason (developer's words)
"Option B separates servers, reducing any mixups or additional fixes. You can also wipe the whole test container independently. The only downside is confusing the ports."

### Trade-offs and mitigations
- Port confusion → distinct variable names (`DATABASE_URL` vs `TEST_DATABASE_URL`) and a test setup that refuses to run against a database whose name doesn't end in `_test`. (planned)
- Both services use the same image tag so dev and test cannot drift.
- The test service mirrors CI, which also runs a single standalone Postgres.

---

## DEC-004 – Email and password sign-in (Better Auth)

- **Date:** 2026-09-24
- **Status:** Accepted
- **Rubric areas:** Working solution, Data & backend (security)

### Context
The brief asks for "a minimal but secure authentication approach appropriate for the chosen stack". The evaluator must be able to sign up, sign in and test every journey quickly.

### Options considered

| Option | For | Against |
|---|---|---|
| A. Email + password (Better Auth) | Evaluator can register in seconds or use a seeded demo account; no external setup; works identically locally, in CI and when deployed; Better Auth provides password hashing and rate limiting | App is responsible for password-related risks (brute force, enumeration, weak passwords) |
| B. Google sign-in | No passwords stored | Google app starts in Testing mode (only listed users can sign in); exact callback URLs per environment; evaluator needs a Google account; harder to automate in tests |

Initially leaned towards B; switched after comparing the trade-offs.

### Decision
**Option A – email and password.**

### Reason (developer's words)
"I need the evaluator to be able to test the app with as much ease as possible."

### Consequences / mitigations (planned)
- Password hashing handled by Better Auth – never store or log plain passwords.
- Rate limiting on sign-in (Better Auth built-in) – watchlist S11.
- Generic sign-in error ("Invalid email or password") – watchlist S12.
- Minimum password length enforced.
- Seeded demo account documented in the README for the evaluator.
- Email verification and password reset are out of scope (documented limitation).
- Audit: `auth.sign_up`, `auth.sign_in`, `auth.sign_in_failed`, `auth.sign_out`.

---

## DEC-005 – Audit logging policy for authentication and domain events

- **Date:** 2026-09-25
- **Status:** Accepted
- **Rubric areas:** Data & backend, Working solution (audit log), security

### Decisions

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | Store the email tried in a failed sign-in? | **No.** `user_id` is NULL and no email is stored | Avoids storing personal data of people who may not be users (OWASP logging guidance: avoid/mask personal data). Attacks remain detectable from IP + timestamp patterns. Trade-off: we lose which account was targeted. Pseudonymisation (e.g. hashing the email) considered and rejected to keep scope small |
| 2 | Audit write fails for an **auth** event? | **Sign-in/up/out still succeeds**; the audit failure is reported on the server (`console.error`, visible in Vercel logs) – never silent | MovieShelf is not a high-assurance system; blocking authentication because logging failed is not justified. (If the whole DB were down, sign-in would fail anyway – sessions share the DB) |
| 3 | Audit write fails for a **domain** event (collection, rating)? | **Same transaction** as the change – if either fails, both roll back | A rating or collection change can never exist without its audit record |
| 4 | What goes in `details` for auth rows? | Outcome, short reason code (e.g. `invalid_credentials`), IP address, user agent | Supports investigation of suspicious activity |
| 5 | What never goes in `details`? | Passwords, password hashes, session/access tokens, cookies, API keys, secrets, the tried email | Logs are read more widely than the database and are often retained longer |

### Notes
- The reason code must never distinguish "email not found" from "wrong password" (would reintroduce account enumeration – watchlist S12).
- IP address is personal data under GDPR; stored for the legitimate purpose of security monitoring. Documented in the README.
- Developer's reasoning (own words): "the assessment asks for an audit trail, but this isn't a high-assurance system where denying authentication because an audit subsystem is temporarily unavailable is necessarily justified."
- Amendment (2026-09-28): IP address and user agent are stored for security investigation but never shown in the activity view or API, because accounts such as the demo account can be shared.

## DEC-006 – TMDB integration: director search via person credits

- **Date:** 2026-09-26
- **Decision:** Director search resolves the name with `/search/person` (first result whose `known_for_department` is Directing), then reads `/person/{id}/movie_credits` and keeps only crew entries with `job = "Director"`. Genre-only search uses `/discover/movie` (popularity order, `vote_count >= 50`). Director + genre filters the director's films by `genre_ids`.
- **Why:** `/discover/movie?with_crew=` matches any crew job (producer, writer), which returns wrong results for "movies directed by X".
- **Trade-offs:** The first matching director wins (ambiguous names are possible); director results are paginated in memory (a director's filmography is small).
- **Resilience:** 6 s timeout; 429 surfaces as "rate limited", network/5xx/malformed JSON as 503 with a friendly message; malformed items are dropped individually; genre list cached for 1 hour. Movies are stored locally only when a user adds or rates them.

## DEC-007 – AI natural-language search design

- **Date:** 2026-09-26
- **Decision:** Any OpenAI-compatible chat completions API, configured by `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (default Google Gemini `gemini-3.5-flash-lite`, chosen for a free tier and low latency). The model returns only `{director, genre}`; the output is validated with a strict Zod schema, the genre is mapped to TMDB's genre list, the director name must match a letters-only pattern, and the search itself is deterministic (DEC-006).
- **Fallback:** No key, HTTP error, timeout (8 s), invalid JSON, extra keys, wrong types or no usable criteria all switch to a rule-based parser. The UI states which path was used.
- **Safety:** Query limited to 200 characters; the model has no tools and cannot write data; prompt-injected output can at most produce a wrong search. Every request is audited (`ai.search`) with criteria, source and query length, not the raw text.

## DEC-008 – API shape and authorisation

- **Date:** 2026-09-26
- **Decision:** Route handlers under `/api` for mutations (`PUT/DELETE /api/collection/{tmdbId}`, `PUT /api/ratings/{tmdbId}`), reads rendered by server components calling the same service functions. Every handler goes through `withUser`, which takes the user from the session cookie, never from the request, and rejects cross-origin mutations (403) on top of SameSite=Lax.
- **Status codes:** 201 created / 200 already existed or updated / 204 removed / 401 no session / 403 cross-site / 404 not in your collection / 422 validation (strict schemas reject unknown fields) / 429 / 503 upstream. Errors share one shape `{ error: { code, message, fields? } }`; internals are logged server-side only.
- **Why PUT for add:** idempotent – adding twice is harmless and creates one row and one audit event.
