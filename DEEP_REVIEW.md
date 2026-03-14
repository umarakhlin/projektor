# Projektor — Deep Review

**Date:** March 2026  
**Scope:** Security, data layer, API design, frontend, robustness, and maintainability.

---

## 1. Architecture & structure

**Strengths**
- Clear App Router layout: pages under `app/`, API under `app/api/`, shared logic in `lib/`.
- Auth and session used consistently via `getServerSession(authOptions)` and `useSession()`.
- Prisma schema matches domain (User, Project, Role, Application, Offer, Membership, Task, Update, Report, ChatMessage).

**Issues**
- **Dead code:** `src/lib/db.ts` exports `getFeedProjects()` but it is never imported; feed uses inline Prisma in `app/api/feed/route.ts`. Either use `getFeedProjects` in the feed route or remove `db.ts` / the helper.
- **Middleware matcher:** `"/projects/:id/space"` only matches that exact segment; dynamic segment name is `:id` but Next.js uses it as a single segment. Confirm it protects `/projects/[id]/space` (it does).

---

## 2. Security

**Strengths**
- All mutation APIs check session and, where needed, ownership or membership.
- Passwords hashed with bcrypt (cost 12) on signup; compared on sign-in.
- Rate limiting on signup, create project, applications, and reports.
- Moderator-only admin uses `MODERATOR_EMAILS` env; no hardcoded IDs.

**Issues & recommendations**
- **Email validation:** Signup does not validate email format. Add a simple regex or use a validator to reject invalid emails and reduce abuse.
- **Profile PATCH:** No max length or structure validation on `name`, `skills`, `links`, `availability`, or `settings`. A very large `links` array could be stored. Add reasonable limits (e.g. 20 links, 500 chars per field) and validate structure.
- **JSON.parse in API:** In `profile/route.ts` and `profile/[userId]/route.ts`, `JSON.parse(user.skills)`, `user.links`, `user.settings` can throw if DB contains invalid JSON. Wrap in try/catch and fall back to `[]` or `{}`.
- **JWT/session:** `session.user.id` is set from token; ensure it is always a string. NextAuth typings are extended in `types/next-auth.d.ts`; no issue found.
- **CSRF:** Next.js API routes with same-origin cookies are not automatically protected by a double-submit cookie. Relying on SameSite cookies and auth checks is acceptable for MVP; for sensitive actions consider CSRF tokens if you add cross-origin or cookie-less clients.

---

## 3. Data layer & Prisma

**Strengths**
- Schema is normalized; relations and cascades are sensible.
- Offer accept uses a transaction (offer + application + membership + role update).
- Migrations present (e.g. `add_chat_messages`).

**Issues & recommendations**
- **project-validation.ts:** `validatePublishChecklist` uses `JSON.parse(project.rewardModels)`. If `rewardModels` is corrupted, this throws. Wrap in try/catch and treat parse failure as “no reward model”.
- **Feed / explore:** Stage and category from query params are passed straight into Prisma `where`. Prisma will only match enum values; non-enum values yield no results. Optional: validate against enum before query.
- **SQLite in production:** Plan is SQLite for dev and PostgreSQL for prod. Ensure `DATABASE_URL` and any SQLite-specific usage (e.g. case sensitivity) are documented and tested for Postgres.

---

## 4. API design & robustness

**Strengths**
- Consistent 401/403/404 and JSON error bodies.
- List endpoints use limit/offset (feed) and return `hasMore` where relevant.

**Issues & recommendations**
- **applications page (frontend):** `app.links` is rendered with `JSON.parse(app.links)`. If the stored string is invalid, the page can throw. Wrap in try/catch and show “Links: (unable to display)” or omit.
- **Project detail / explore / page.tsx:** `JSON.parse(project.rewardModels)` and `JSON.parse(role.requirements)` can throw on bad data. Use a small helper, e.g. `safeParseJson(str, fallback)`, and use fallback on error.
- **Offer accept race:** Two users accepting the last slot: both pass `openSlots > 0`, then both run the transaction. Prisma’s increment and unique constraint on membership prevent double-join, but you could end up with `filledCount > openings` if not careful. Current code checks `roleUpdated.filledCount >= roleUpdated.openings` after the transaction to set Filled; the increment is atomic, so this is acceptable. Optional: use a serializable transaction or `SELECT ... FOR UPDATE` in production for stricter consistency.
- **PATCH body parsing:** Several routes use `await req.json()` without try/catch. Malformed JSON returns a 500. Catch and return 400 with a clear message.

---

## 5. Frontend & UX

**Strengths**
- Protected routes redirect to sign-in with `callbackUrl`.
- Loading and error states on main flows (apply, inbox, applications, create).
- Welcome block on home for unauthenticated users (Sign up, Sign in, Browse as visitor).

**Issues & recommendations**
- **Home page:** Duplicate heading “Discover projects” in the conditional (both branches identical). Remove the conditional and keep one “Discover projects”.
- **Apply page:** If `role.requirements` is stored as JSON array string but malformed, `JSON.parse(role.requirements)` can throw. Wrap in try/catch; treat as `[]` on error.
- **Admin reports:** Page fetches `/api/admin/reports`; on 403 it sets `accessDenied`. Good. Ensure 401 (unauthenticated) is handled (e.g. redirect to sign-in) if the matcher allows unauthenticated access.
- **Accessibility:** Forms lack explicit `<label>` association and aria attributes. Add `htmlFor` and `id` on key inputs and consider `aria-invalid` / `aria-describedby` for errors.

---

## 6. Configuration & environment

**Strengths**
- `.env.example` documents `DATABASE_URL`, `NEXTAUTH_*`, `OPENAI_API_KEY`, `MODERATOR_EMAILS`.
- No secrets committed in code.

**Recommendations**
- Document that `NEXTAUTH_URL` must match the app origin (including port in dev).
- If using OpenAI, document that prompts may include user/project content and link to provider privacy/terms.

---

## 7. Performance

**Strengths**
- Feed uses limit (capped at 50) and offset.
- No obvious N+1 in reviewed routes; includes are used appropriately.

**Recommendations**
- **Rate limit store:** In-memory Map does not scale across multiple instances. For production, use Redis (or similar) and document in PLAN.md.
- **Chat messages:** Limited to 200; no pagination. Acceptable for MVP; add cursor/limit later if needed.
- **Application stats:** Fetched on every header load for logged-in users. Consider caching (e.g. short TTL) or fetching only on My Projects if traffic grows.

---

## 8. Code quality & maintainability

**Strengths**
- TypeScript used throughout; Prisma types and shared types (e.g. `ProjectInput`, `RoleInput`) in one place.
- SPEC.md and PLAN.md are up to date and useful.

**Recommendations**
- **Centralize safe JSON parse:** Add `lib/safe-json.ts` with something like `safeParseJson<T>(str: string | null, fallback: T): T` and use it wherever you parse stored JSON (profile, project, role, application links, rewardModels).
- **Error messages:** Some APIs return `error: "Something went wrong"`. For critical paths, log the cause (e.g. in signup) and avoid leaking internals to the client.
- **Duplicate logic:** “Is current user project member/owner” is repeated in several API routes. Consider a small helper, e.g. `getProjectAccess(projectId, session)` returning `{ project, isOwner, isMember }` or 403/404.

---

## 9. Spec & plan alignment

- Core flows (publish → discover → apply → offer → accept → active, lifecycle, team space, chat, reporting, AI suggestions, metrics) are implemented.
- PLAN.md “Launch Readiness” matches current state; remaining items are production config and wiring metrics to an analytics provider.

---

## 10. Priority summary

| Priority | Item | Action |
|----------|------|--------|
| **High** | JSON.parse throws on bad DB data | Add safe parse helper and use in profile, project-validation, applications page, apply page, project detail, explore |
| **High** | Profile PATCH unbounded input | Add length/structure limits and validation for name, skills, links, availability, settings |
| **Medium** | Signup email format | Validate email format (regex or validator lib) |
| **Medium** | API req.json() | Wrap in try/catch; return 400 on parse error |
| **Low** | Dead code | Remove or use `getFeedProjects` in feed route |
| **Low** | Home page duplicate heading | Single “Discover projects” heading |
| **Low** | Rate limit in production | Document Redis (or similar) for multi-instance |

---

## Conclusion

The codebase is coherent, auth and authorization are applied consistently, and the main user flows are implemented and aligned with the spec. The most impactful follow-ups are hardening around stored JSON (safe parsing everywhere) and input validation (profile and signup). Addressing the high-priority items will reduce runtime errors and improve resilience against bad or malicious input.
