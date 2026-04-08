# Projektor — Implementation Plan

## Completed So Far

- Project scaffolding (Next.js, TypeScript, Tailwind)
- Basic layout and home page
- App name set to **Projektor**
- Step 1: Database & data model (Prisma, SQLite)
- Step 2: Authentication (sign up, sign in, sign out, protected routes)
- Step 3: User Profiles & Settings (edit profile, public view, show email setting)
- Step 4: Project Creation Wizard (4 steps, publish quality gate)
- Step 5: Discovery Feed & Explore (home feed, project detail, filters, Explore page)
- Step 6: Apply → Offer → Accept flow (applications, offers, inbox, my-projects)
- Step 7: Project Lifecycle & Team Space (Active/Close/Reopen, updates, tasks, member list)
- Step 8: Trust & Safety (rate limits, reporting, moderation queue)
- Step 9: AI Layer (OpenAI integration: structure suggestions, role suggestions)
- Step 10: Instrumentation (metrics tracking for north-star and supporting events)

---

## Next Steps (In Order)

### 1. Database & Data Model

- Add Prisma schema for core entities: Users, Projects, Roles, Applications, Offers, Memberships, Tasks, Updates, Reports, SavedSearches
- Run migrations (SQLite for dev; optionally PostgreSQL for production)
- Wire up `@prisma/client` and basic query helpers

### 2. Authentication

- Sign up (email + password)
- Log in / Log out
- Session handling (NextAuth.js or custom)
- Protected routes for logged-in users

### 3. User Profiles & Settings

- Lightweight profile: name, skills, links, availability
- Profile visible to creators when reviewing applications
- Profile + Settings (visibility, preferences)

### 4. Project Creation Wizard

- 4-step wizard: Step 1 (Pitch + category + stage) → Step 2 (Expectations + reward model) → Step 3 (Roles) → Step 4 (Review & Publish)
- Publish quality gate (minimum completeness checklist) — block Publish and highlight missing fields
- Project status: Draft → Recruiting
- **AI:** Project Structuring Assistant (rewrites pitch, clarifies problem/solution, suggests expectations, improves reward framing)
- **AI:** Role Generator (suggests missing roles, skills, time commitments, compensation ranges)

### 5. Discovery Feed & Explore

- Home feed shows **Recruiting** and **Active** projects only; Closed viewable via direct link
- Project and role cards; Project Detail page; Role Detail (optional deep link)
- Filters: role type, skills/tags, compensation type, stage, category, commitment
- Explore page with full filter panel; saved searches
- Pagination / infinite scroll
- **AI:** Smart Match Score (skills alignment, availability, compensation preference, past participation)

### 6. Apply → Offer → Accept Flow

- Application form (message, links, availability)
- Creator pipeline: Applied → In Review → Offered → Accepted / Rejected / Declined
- Offer creation; Builder accept/decline (Declined = builder declines offer)
- Membership creation on accept; role openings decrement
- Creator: Manage Project, Manage Roles, Applications (pipeline)
- My Projects page (joined / created); Inbox (applications, offers, notifications)
- **AI (Application):** Improves message clarity, prompts addressing commitment, suggests portfolio additions
- **AI (Recruiting):** Applicant summaries, role-fit analysis, availability alignment — *does not auto-decide outcomes*

### 7. Project Lifecycle & Team Space

- **Project lifecycle:** Owner sets Active (when ≥1 member); Owner can Close / Reopen
- Team Space (MVP-light): project-scoped updates/announcements; simple milestones/task list (To Do / Doing / Done); member list and roles
- **AI:** Summarizes discussions, extracts action items, suggests milestones, detects inactivity patterns

### 8. Trust & Safety

- Rate limits; reporting for projects/users; moderation queue (platform moderator)
- *Publish quality gate is implemented in Step 4; here: robustness and anti-abuse*
- **AI:** Project Clarity Score (flags vague scope or unrealistic expectations)

### 9. AI Layer (Phase 2)

- Integrate LLM provider (e.g. OpenAI, Anthropic) for all AI features above
- **AI monetization:** Free tier (basic structuring, limited match scoring) vs Pro (advanced match scoring, recruiting assistant, project health diagnostics)

### 10. Instrumentation & Launch Readiness

- Instrument north-star and supporting metrics (projects reaching Active, time-to-application, roles filled, etc.)
- Resolve open questions before launch: Startup vs Creative positioning; notification channels (in-app vs email)

---

## Launch Readiness Checklist

- [x] Core flows: publish → discover → apply → offer → accept → active
- [x] Project lifecycle (Draft → Recruiting → Active → Closed)
- [x] Team Space (updates, tasks)
- [x] Rate limiting (signup, create project, applications, reports)
- [x] Reporting and moderation (MODERATOR_EMAILS env)
- [x] AI suggestions (OPENAI_API_KEY for improve pitch, suggest roles)
- [x] Metrics instrumentation (`src/lib/metrics.ts`)
- [ ] Production: set DATABASE_URL (PostgreSQL recommended)
- [ ] Production: set NEXTAUTH_SECRET and NEXTAUTH_URL
- [ ] Production: wire metrics to analytics provider (PostHog, Amplitude, etc.)

---

## Release Alignment (Product GO/NO-GO)

This section aligns engineering execution with the Product "Final Release Decision Pack".

### Current status by pack section

- **Must-have completed items:** Treated as launch-accepted and done.
  - Auth/session launch reliability (including explicit 401/403 behavior on core UX)
  - Submission integrity hardening for `POST /api/applications`
  - Production-readiness release discipline and launch gate definition
- **Deferred (post-launch):** Keep deferred unless they become launch-blocking.
  - Broader non-critical API test expansion
  - Deep observability/dashboard tuning beyond minimum launch signals
  - Wider E2E coverage for secondary journeys
  - Non-launch auth/system refactors
  - Performance work not tied to launch-critical regressions

### Launch gate (must all be true at release cut)

- Core smoke journey passes in production-like environment:
  - auth -> valid session -> submit application -> success confirmation
- Critical API checks pass:
  - auth/session path checks
  - `POST /api/applications` write-path checks
- No open P0/P1 defects in auth/session or submission integrity paths
- No unresolved duplicate-write or partial-write behavior on submission retries
- Rollback owner identified and on-call during launch window

### Automatic NO-GO triggers

- Smoke journey fails and cannot be reproduced/fixed quickly
- Submission path shows data loss, duplicate creation, or inconsistent state
- Auth failures cause lockout/looping in launch flow
- Any critical checklist item is unverified or skipped

### Day-0 rollback triggers

- Data integrity breach: duplicate or missing/partial submissions
- Sustained auth outage pattern blocking core flow
- Repeated 5xx spikes on launch-critical endpoints with user impact
- Core auth + submission journey success rate drops below acceptable threshold
- No verified hotfix within agreed incident timebox

### Weekly execution mapping (engineering)

- **Week 1:** Release checklist discipline + auth/session reliability verification (done)
- **Week 2:** Redis-backed rate limiting for production robustness (in progress / pending)
- **Week 3:** Launch-critical regression tests and smoke gate automation
- **Week 4:** Day-0 monitoring and rollback drill readiness

---

## AI Design Principles

- **Execution-first** — AI increases shipping, not chatting
- **Structured augmentation** — AI enhances fields, does not replace them
- **Context-aware suggestions** — Suggestions based on project type, role, stage
- **Human-in-the-loop** — No autonomous hiring; humans decide outcomes

---

## AI MVP Boundaries

- No autonomous hiring decisions
- No payment automation
- No complex predictive reputation scoring

---

## Tech Stack

| Layer     | Choice                           |
| --------- | -------------------------------- |
| Framework | Next.js 14 (App Router)          |
| Language  | TypeScript                       |
| Styling   | Tailwind CSS                     |
| Database  | SQLite (dev) / PostgreSQL (prod) |
| ORM       | Prisma                           |
| Auth      | TBD (NextAuth or custom)         |
| AI        | TBD (OpenAI / Anthropic API)     |

---

## Reference

- `SPEC.md` — Full product specification
- `Requirements Projektor.pdf` — Original PRD
- `Requirements AI projektor.docx` — AI layer spec
- North-star metric: % of published projects that reach Active within 30 days
