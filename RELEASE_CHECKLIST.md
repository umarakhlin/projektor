# Pre-Release Reliability Checklist (Auth + Env + DB)

This checklist is for MVP launch readiness only.

## Required Environment Variables

All must be set before startup:

- `NEXTAUTH_SECRET` (non-empty, strong secret)
- `NEXTAUTH_URL` (absolute `http(s)` URL matching exact app origin)
- `DATABASE_URL` (non-empty real connection string)

## Verification Steps

Run these in `projector-app`:

1. Automated env checks:
   - `npm test -- auth-env.test.ts launch-env.test.ts`
2. Automated callback/origin checks:
   - `npm test -- auth-callback-url.test.ts`
3. Startup fail-fast (manual):
   - Temporarily unset one required env var in `.env` (for example `NEXTAUTH_SECRET`).
   - Run `npm run dev`.
   - Expected: startup fails immediately with explicit missing-env error.
   - Restore `.env`.
4. Auth callback/origin consistency (manual):
   - While signed out, open `/create` (protected route).
   - You should be redirected to `/auth/signin?callbackUrl=...`.
   - Sign in with valid credentials.
   - Expected: redirect back to `/create` (same origin), session active.
5. Session reliability (manual):
   - Refresh the page after sign-in.
   - Navigate between `/`, `/explore`, `/inbox`, `/my-projects`.
   - Expected: session remains active; no redirect loops.
6. Deterministic sign-out (manual):
   - Click Sign out.
   - Expected: redirected to `/`.
   - Open `/create` again.
   - Expected: redirected to `/auth/signin` (session cleared).

## GO / NO-GO

GO only if all checks pass.

NO-GO if any of the following occur:

- App starts without one of the required env vars.
- `NEXTAUTH_URL` does not match app origin and causes session/callback issues.
- Protected-route login flow loops or lands on broken callback paths.
- Sign-out does not reliably clear access to protected routes.
