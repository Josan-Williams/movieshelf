# Self-study list (after submission / before the presentation)

Parts built quickly under deadline pressure. Be able to explain each in your own words.

## Must know for the presentation
1. Request flow end to end: browser -> route handler -> `withUser` (session, origin check) -> Zod -> service -> transaction (change + audit) -> JSON. Files: `src/server/http.ts`, `collection.ts`, `ratings.ts`.
2. Why audit rows are written in the same transaction for domain events but best-effort for auth events (DEC-005).
3. The AI pipeline and its fallbacks (DEC-007): why the model never touches the database, what happens with invalid output, why the raw query is not stored.
4. Why the director search uses `movie_credits` instead of `discover?with_crew` (DEC-006).
5. Status codes table (DEC-008), especially 401 vs 403 vs 404 and PUT idempotency.
6. The rating upsert: `ON CONFLICT ... DO UPDATE`, why it avoids a race, what `xmax = 0` means.
7. How the tests mock TMDB (`vi.mock`) and the AI (fake fetch), and why the database is real in integration tests.

## Deeper topics
- Better Auth hooks: before vs after, `APIError`, `getSessionFromCtx`; why sign-out must be captured in `before`.
- Cookie flags (HttpOnly, SameSite Lax vs Strict, Secure), CSRF vs XSS, why the origin check is defence in depth.
- `x-forwarded-for` trust and proxies.
- Docker Compose: image pinning, env interpolation, port binding to 127.0.0.1, volumes vs tmpfs, orphans, `down -v`.
- Drizzle migrations and snapshots; never edit an applied migration.
- ON DELETE cascade vs restrict vs set null; the GDPR tension with audit logs.
- Secrets: CSPRNG, rotation, separate dev and prod values.
- PowerShell 5.1 quoting with native programs; `user` as a reserved word in Postgres.
- Server vs client components in the App Router; `router.refresh()`.

## Unanswered earlier questions
- TRUNCATE vs DELETE and the append-only trigger.
- Why the test global setup refuses to run against a non-test database.
- Why `updated_at = now()` is set in the upsert.
- Re-explain DEC-001 to DEC-008 without notes.

## Videos
- Better Auth: https://www.youtube.com/watch?v=ngzLhaT3IzQ
- Drizzle + Docker + Postgres: https://www.youtube.com/watch?v=7zQjYr9ZuUg
- CSRF vs XSS: https://www.youtube.com/watch?v=bZcxSnrKyfg
- App Router: https://www.youtube.com/watch?v=1fXuWa8-74c
- Vitest: https://www.youtube.com/watch?v=urLvFZndtY0
- GitHub Actions: https://www.youtube.com/watch?v=56kP5a6w_Kk
