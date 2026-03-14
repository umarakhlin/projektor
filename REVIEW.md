# Projektor — Deep Review

This document summarizes a deep review of the codebase: security, data handling, API design, frontend robustness, and configuration. It also lists what was fixed and what remains recommended.

---

## 1. Executive Summary

- **Scope:** Next.js 14 App Router app with Prisma (SQLite), NextAuth (credentials + JWT), and optional OpenAI/Resend.
- **Strengths:** Clear structure, auth and protected routes, rate limiting, publish checklist, AI and email hooks, metrics.
- **Risks addressed:** Unsafe `JSON.parse` on DB-stored strings (can crash on malformed data). A safe-parse utility was added and used in critical server paths.
- **Remaining recommendations:** Use safe parse everywhere JSON is read from DB; harden profile/skills/links validation; consider Redis for rate limits in production; ensure `NEXTAUTH_URL` matches app URL.

---

## 2. Security

### 2.1 Authentication & session

- **NextAuth** with credentials provider and JWT strategy is used consistently.
- **Session:** `session.user.id` is set in JWT/session callbacks; types extended in `types/next-auth.d.ts`.
- **Middleware** protects `/create`, `/my-projects`, `/inbox`, `/profile`, `/admin`, `/projects/:id/space`; unauthenticated users are redirected to `/auth/signin`.
- **Recommendation:** Ensure `NEXTAUTH_URL` in `.env` matches the URL users actually use (e.g. `http://localhost:3002` if the app runs on 3002). Mismatch can prevent the session cookie from being set or sent.

### 2.2 Authorization

- **APIs** check `getServerSession(authOptions)` and `session?.user?.id` before acting.
- **Project-scoped routes** (applications, status, updates, tasks, chat) verify the user is owner or member where required.
- **Admin/reports** are gated by `MODERATOR_EMAILS` (env list of allowed emails).
- **Reports:** `targetType` is validated as `Project` or `User`; `targetId` is not checked for existence (report is still created). Optional: validate that the target exists and is viewable.

### 2.3 Input validation

- **Signup:** Email and password required; password length ≥ 8; duplicate email returns 409.
- **Profile PATCH:** `skills` and `links` are accepted as arrays and stored as JSON. No schema or size limit; very large or deeply nested payloads could be stored. **Recommendation:** Limit array length and string lengths (e.g. skills ≤ 50 items, link URL/label length).
- **Applications:** `message`, `links`, `availability` from body; `links` stored as JSON. Consider validating structure and size.
- **Projects:** Creation and update use shared validation; reward models and roles are structured. Publish checklist blocks incomplete projects.

### 2.4 Rate limiting

- **In-memory** rate limiter in `lib/rate-limit.ts` (signup, project creation, applications, reports).
- **Limits:** Signup 5/15 min by IP; project create 5/15 min by user; applications 10/15 min by user; reports 10/min by user.
- **Production:** In-memory state is per-instance and lost on restart. **Recommendation:** Use Redis (or similar) for production so limits are shared and persistent.

---

## 3. Data & database

### 3.1 Safe JSON parsing (fixed in critical paths)

- **Issue:** Many places used `JSON.parse()` on strings from the DB (e.g. `rewardModels`, `requirements`, `skills`, `links`, `settings`, `filtersJson`). Malformed or non-JSON data can throw and crash the request.
- **Fix:** Added `lib/safe-json.ts` with `parseJson`, `parseJsonArray`, `parseJsonObject` (try/catch + fallbacks).
- **Updated to use safe parse:**  
  `lib/project-validation.ts`, `api/profile/route.ts`, `api/profile/[userId]/route.ts`, `api/saved-searches/route.ts`, `app/projects/[id]/page.tsx` (rewardModels, role requirements).

### 3.2 Remaining JSON.parse usages (recommended to harden)

| Location | Field | Recommendation |
|----------|--------|----------------|
| `app/explore/page.tsx` | `project.rewardModels` | Use `parseJsonArray` (client) or ensure API returns already-parsed/safe data. |
| `app/create/page.tsx` | `p.rewardModels` in checklist | Use safe parse or API that returns validated data. |
| `app/projects/[id]/apply/[roleId]/page.tsx` | `role.requirements` | Use safe parse or ensure API returns array. |
| `app/projects/[id]/applications/page.tsx` | `app.links` | Use safe parse before `.map()` (client). |
| `lib/ai.ts` | LLM output parsing | Keep try/catch; already in controlled context. |

For client components, either use a small `safeParse` helper that returns a fallback on catch or have the API return already-parsed/sanitized structures.

### 3.3 Prisma schema

- **Schema** is consistent: enums for status/stage/type; relations and cascades defined; JSON stored as `String` with comments.
- **SQLite** in dev; production can switch to PostgreSQL via `DATABASE_URL`.
- **Migrations:** Use `npx prisma migrate dev` for changes; ensure migrations are applied in CI/production.

---

## 4. API design

### 4.1 Consistency

- **Auth:** 401 for missing/invalid session; 403 for forbidden; 404 for missing resource; 400 for bad input; 429 for rate limit.
- **JSON:** APIs return JSON; errors use `{ error: "..." }` or similar.
- **Ids:** CUIDs used; no integer IDs exposed.

### 4.2 Error handling

- **APIs** generally return appropriate status codes and messages.
- **Fetch on client:** Many pages use `res.ok ? res.json() : []` or similar. Empty array/object fallbacks avoid crashes but can hide 401/500. **Recommendation:** For critical flows, check `res.status` and show a message or redirect on 401/403/5xx.

### 4.3 Specific routes

- **GET /api/projects:** Returns list of projects owned by the user. Good.
- **GET /api/me/memberships:** Returns memberships with project and role. Good.
- **GET /api/me/application-stats:** Returns `totalOpen` and `byProject`. Used by header and my-projects. Good.
- **Reports POST:** Does not verify that `targetId` exists. Optional improvement: resolve target and return 404 if not found.

---

## 5. Frontend

### 5.1 Robustness

- **my-projects:** Now uses `Array.isArray()` for projects/memberships and safe handling of `stats.byProject`; `.catch()` on fetch to avoid unhandled rejection; optional chaining on `p.roles` and `m.project`/`m.role`.
- **Explore, inbox, create:** Use loading and empty states; defensive checks could be added where API data is assumed to be in a fixed shape.

### 5.2 Auth flow

- **Sign-in** uses `redirect: true` and full redirect URL from `window.location.origin` so the session cookie is set and the app stays on the same origin.
- **Sign-in errors** shown via `?error=CredentialsSignin` and optional error state.

### 5.3 Accessibility & UX

- **Forms** use labels and basic structure.
- **Recommendation:** Add `aria-live` or screen-reader text for dynamic errors; ensure focus management after sign-in/sign-up.

---

## 6. Configuration & deployment

### 6.1 Environment variables

- **Required:** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- **Optional:** `OPENAI_API_KEY`, `MODERATOR_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`.
- **.env.example** documents these; comment notes that `NEXTAUTH_URL` must match the app URL (including port).

### 6.2 Next.js & dependencies

- **Next.js** pinned to 14.2.23; Prisma to 6.19.0. Avoid `npm audit fix --force` to prevent unwanted major upgrades.

---

## 7. Testing

- **Unit tests:** `project-validation` (publish checklist) and `rate-limit` (limits and key builder).
- **Recommendation:** Add API route tests (e.g. feed, auth callback) and one or two key UI flows with mocks.

---

## 8. Checklist of recommended next steps

1. **Safe JSON:** Replace remaining raw `JSON.parse` in explore, create, apply, and applications pages (client or API) with safe parse or pre-validated API responses.
2. **Profile/skills/links:** Add max lengths and array size limits for profile PATCH.
3. **Reports:** Optionally validate `targetId` (project or user exists).
4. **Rate limiting:** Plan Redis (or similar) for production.
5. **NEXTAUTH_URL:** Document and verify in deployment (e.g. production URL and port).
6. **Tests:** Add a few API and/or integration tests for critical paths.
7. **Error UX:** On 401/403/5xx from key APIs, show a clear message or redirect instead of silently falling back to empty data.

---

*Review date: March 2025. Codebase: Projektor (Next.js 14, Prisma, NextAuth).*
