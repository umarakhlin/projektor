# Projektor — Full Product Specification

**Version:** 1.2  
**Date:** March 2026  
**App name:** Projektor  

---

## Glossary

| Term | Definition |
|------|------------|
| **Creator** | User who creates and owns a project; can manage roles, review applications, send offers. |
| **Builder** | User who discovers projects and applies to roles; becomes a **Member** when an offer is accepted. |
| **Member** | User with an accepted offer on a project; can post updates and manage tasks in Team Space. |
| **Draft** | Project status: private, editable, not in feed. |
| **Recruiting** | Project status: public, applications open, visible in feed. |
| **Active** | Project status: team executing; requires at least one member besides the owner. |
| **Closed** | Project status: read-only, no new applications (unless reopened). |
| **Publish quality gate** | Minimum completeness checklist required before a Draft can become Recruiting. |
| **Platform moderator** | Trust & safety role (internal/ops); reviews reports and moderation queue; not a project owner. |

---

## 1. Product Overview

Projektor is an execution-first platform where ideas become teams and teams build real projects together.

- **Project-first** (not profile-first), structured enough to turn intent into action
- Supports multiple reward models beyond salary: equity, revenue share, portfolio, volunteer, hackathon

**Positioning:** LinkedIn is resumes. Discord is conversations. Projektor is building projects.  
**Vision:** Become the default place where small teams form quickly and ship.

---

## 2. Problem Statement

- People with ideas struggle to recruit collaborators quickly for a specific project.
- Builders struggle to find trustworthy projects with clear expectations and meaningful roles.
- Existing platforms optimize for resumes (LinkedIn) or conversations (Discord), not for building.

---

## 3. Target Users & Personas

| Persona | Description |
|---------|-------------|
| **Idea Owner (Creator)** | Creates a project, defines roles, recruits a team, drives execution. |
| **Builder (Contributor)** | Joins a project for experience, portfolio, learning, income, or ownership. |
| **Mentor/Advisor** | (Optional, later) Provides guidance without being a daily contributor. |

**Core needs by persona**

| Persona | Needs |
|---------|-------|
| Creators | Clarity, momentum, role-based recruiting, commitment/terms, lightweight project management. |
| Builders | Discoverability, clear scope + expectations, trustworthy signals, simple application + acceptance flow. |

---

## 4. Goals, Non-Goals & Success Metrics

### Goals (MVP)

- Increase the percentage of projects that reach **Active** status.
- Reduce talk-only behavior via lightweight structure and commitment workflows.
- Make role-based recruiting fast and clear.
- Support multiple reward models: paid, equity/partnership, revenue share, portfolio/experience, volunteer, hackathon.

### Non-Goals (MVP)

- Full recruitment/ATS system for enterprise hiring.
- General-purpose community chat replacement.
- Full-featured project management (Gantt, advanced dependency tracking, etc.).

### Success Metrics

| Metric | Type |
|--------|------|
| % of published projects that reach Active within 30 days | North-star |
| Time-to-first-application | Supporting |
| Time-to-first-role-filled | Supporting |
| Roles filled per project | Supporting |
| Builder retention (joins/month) | Supporting |
| Project completion rate | Supporting |

---

## 5. Scope

### In Scope (MVP)

- Project-first discovery feed with filters
- Project creation wizard with structured fields and publish gate
- Roles as first-class objects (openings, requirements, compensation)
- Apply → Offer → Accept → Join workflow
- Project statuses: **Draft**, **Recruiting**, **Active**, **Closed**
- Compensation models: paid, equity/partnership, revenue share, portfolio/experience, volunteer, hackathon

### Out of Scope (MVP)

- Endless social posting feed unrelated to projects
- Rich real-time chat as the core experience
- Complex reputation scoring, deep verification, escrow, or payments processing (can be phased later)

---

## 6. Product Strategy

Two plausible market entries; MVP should pick one to avoid split positioning:

- **Option A: Startup focus** — Longer-running, higher commitment, more formal terms.
- **Option B: Creative/side-project focus** — Shorter experiments, maker energy, lower barriers.

---

## 7. Functional Requirements

### 7.1 Discovery Feed

- Feed shows **Recruiting** and **Active** projects only; **Closed** projects are viewable via direct link but do not appear in the feed.
- Feed prioritizes projects and open roles (not personal updates).
- Filter by: role type, skills/tags, compensation type, stage, category (project type), time commitment, language/location (optional).
- Card types: Project cards, Role cards, "Team missing X" highlights.
- Sort: newest, most roles open, soonest starting (optional).

### 7.2 Project Page

- Shows: pitch, problem/solution, **stage**, status, expectations (hours/week, duration), reward model(s).
- **Project stage** (enum for filters and display): *Idea / Validation / Building / Launched* — signals maturity.
- **Project category** (optional, for discovery): e.g. SaaS, Hardware, Creative, Non-profit — distinct from stage; helps builders filter by project type.
- Lists open roles with requirements and Apply CTA per role.
- Shows team roster (after members join) and owner summary (light profile).

### 7.3 Roles

- Each role has: title, requirements (skills), time expectation, openings, compensation (inherit or override).
- Role states: **Open**, **Has Applicants** (applications under review), **Filled**; allow reopen.

### 7.4 Application & Commitment

- Apply to a role with message + proof links (portfolio/GitHub).
- **Application statuses:** Applied → In Review → Offered | Rejected. Creator can also **request more info** (builder can respond; application remains In Review until next action).
- Creator actions: request more info, reject, or issue a **formal offer**. Offer is a distinct step with explicit terms (role, commitment, reward snapshot).
- Builder can accept or decline an offer. On accept: applicant becomes **Member**, role openings decrement, project appears in builder’s “Joined” list.

### 7.5 Team Space (MVP-Light)

- Project-scoped updates/announcements.
- Simple milestones/task list (lightweight).
- Optional lightweight threaded discussion (not the core).

### 7.6 Publish Quality Gate (Minimum Checklist)

Before a project can move from **Draft** to **Recruiting**, the following must be complete (enforced by system; block Publish and highlight missing items if not met):

- **Pitch:** Title and short pitch (problem/solution or description).
- **Expectations:** Hours per week and duration (e.g. 3 months).
- **Reward model:** At least one compensation type selected; if Paid/Equity/Revenue share, required structured fields filled.
- **Roles:** At least one role with title, openings, and skills/requirements.
- **Owner:** Valid project owner (creator) identified.

*(Exact field list and validation rules to be defined in implementation.)*

### 7.7 Status Lifecycle

| Status | Meaning | Key Rules |
|--------|---------|-----------|
| **Draft** | Private project being created | Not visible in feed; can be edited freely. |
| **Recruiting** | Public + accepting applications | Roles visible; applications allowed. |
| **Active** | Team formed and executing | Recruiting can remain on for new roles (optional). |
| **Closed** | Completed or stopped | Read-only; no new applications (unless reopened). |

**Transition to Active:** Allowed only when the project has at least one member besides the owner (e.g. at least one accepted offer).

### 7.8 Compensation Models

| Type | Structured Fields (MVP) | Notes |
|------|-------------------------|-------|
| **Paid** | Currency, range, payment schedule (one-time / hourly / monthly) | No payments processing in MVP; informational. |
| **Equity/Partnership** | Range %, vesting note (optional text) | Informational; emphasize clarity. |
| **Revenue share** | Range %, basis (gross/net), payout cadence (optional) | Informational; clarify terms. |
| **Portfolio/Experience** | What contributor gets (credit, deliverables) | Ideal for creative/learning focus. |
| **Volunteer** | Cause/mission note (optional) | Useful for non-profits. |
| **Hackathon** | Dates, format, link to rules (optional) | Timeboxed events. |

---

## 8. Non-Functional Requirements

- **Performance:** Fast feed browsing with pagination and caching; responsive UI.
- **Security:** Role-based permissions (owner/admin/member); audit trail for offers and status changes.
- **Privacy:** Allow hiding contact details until offer acceptance; basic visibility controls.
- **Accessibility:** Reasonable WCAG-aligned baseline for forms, contrast, keyboard navigation.
- **Notifications:** In-app notifications for applications, offers, and key project events. Email (e.g. new application, offer received) to be defined in implementation; recommend at least in-app first for MVP.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Spam/low-quality projects | Publish gate (minimum completeness), rate limits, reporting. |
| Talk-only usage | Role structure, explicit commitments, clear "Active" milestone. |
| Mismatched expectations | Structured terms (hours/week, duration, compensation model). |
| Overbuilding chat | Keep Team Space minimal; integrate external tools later. |

---

## 10. Information Architecture

### 10.1 Primary Navigation

- Home (Feed)
- Search/Explore (filters, saved searches)
- Create Project
- My Projects
- Inbox (applications/offers/notifications)
- Profile

### 10.2 Sitemap

- Home / Feed
- Explore (advanced filters)
- Project Detail
- Role Detail (optional deep link from feed)
- Apply to Role
- Creator: Manage Project (overview)
- Creator: Manage Roles
- Creator: Applications
- Offers (view/accept/decline)
- Team Space (updates + tasks)
- My Projects (joined/created)
- Profile (light) + Settings

### 10.3 Screen Inventory

| Screen | Key Components |
|--------|----------------|
| **Home / Feed** | Project cards, Role cards, filters, sort, pagination. |
| **Explore** | Full filter panel, saved searches, result list (Project/Role toggle). |
| **Create Project (wizard)** | Step 1: Pitch + category (project type) + stage (maturity). Step 2: Expectations + reward model(s). Step 3: Roles. Step 4: Review + Publish. |
| **Project Detail** | Header (title, owner, stage, category, status, badges), problem/solution, expectations, roles list, team roster, updates/tasks preview, Apply CTAs. |
| **Apply to Role** | Application form (message, links, availability), role terms preview, Submit + confirmation. |
| **Creator: Applications** | Pipeline view per role (Applied, In Review, Offered, Accepted, Rejected); applicant cards; actions (request info, reject, send offer). |
| **Offer view** | Offer summary; Accept/Decline; onboarding prompt to Team Space on accept. |
| **Team Space** | Updates/announcements feed; milestones/tasks list; member list + roles. |

---

## 11. Data Model & Relationships

- **User** creates **Projects**; Projects contain **Roles**.
- Users apply to Roles; **Applications** can become **Offers**.
- Accepted offers create **Memberships** (User ↔ Project ↔ Role) — each membership links a user to a project and the specific role they filled.
- Project status controls visibility and actions (e.g., Closed stops applications).

**Core entities:** User, Project, Role, Application, Offer, Membership, Task, Update, Report, SavedSearch.

---

## 12. Permission Model

| Action | Visitor | Builder (logged-in) | Owner/Admin |
|--------|---------|---------------------|-------------|
| View public projects (Recruiting, Active, Closed) | ✅ | ✅ | ✅ |
| Apply to role | ❌ | ✅ | ✅ (if allowed) |
| Create/edit project | ❌ | ❌ | ✅ |
| Manage roles | ❌ | ❌ | ✅ |
| Review applications/send offers | ❌ | ❌ | ✅ |
| Post updates/tasks | ❌ | Project members only | ✅ |
| Close/reopen project | ❌ | ❌ | ✅ |

---

## 13. User Stories (Epics & Key Stories)

### Epics

- **E1:** Authentication and profiles (lightweight)
- **E2:** Project creation and publishing
- **E3:** Roles and recruiting
- **E4:** Applications and offers
- **E5:** Project lifecycle and team space
- **E6:** Discovery and search
- **E7:** Trust and safety (reporting, anti-spam)

### Key User Stories (Given/When/Then)

| ID | Persona | Story | Acceptance Criteria |
|----|---------|-------|---------------------|
| E2-01 | Creator | Create a new project draft | Draft created; changes saved and visible only to owner. |
| E2-02 | Creator | Publish my project | Status → Recruiting; appears in feed; visitors see open roles. |
| E2-03 | Creator | Define project expectations | hours/week and duration required for publish; displayed to builders. |
| E3-01 | Creator | Add roles to project | Role appears as Open; Apply button shown to builders. |
| E3-02 | Creator | Set compensation model(s) | Reward badges on cards; structured fields enforced. |
| E3-03 | Creator | Override compensation per role | Role displays overridden terms; builder sees role-specific terms. |
| E6-01 | Builder | Browse project-first feed | Cards by recency; pagination/infinite scroll. |
| E6-02 | Builder | Filter by role and skills | Results update; filters persist for session. |
| E6-03 | Builder | Filter by compensation type | Cards show reward badges; empty state with suggestions. |
| E4-01 | Builder | Apply to role with message + links | Form submit; confirmation; creator sees in Applications. |
| E4-02 | Creator | Review applications by role | Grouped by role; view message, links, availability. |
| E4-03 | Creator | Send formal offer | Status → Offered; builder can accept/decline. |
| E4-04 | Builder | Accept offer | Become member; role openings decrement; project in My Projects. |
| E4-05 | Builder | Decline offer | Status → Declined; not added as member. |
| E5-01 | Owner | Set project to Active | Status displayed; at least one member besides owner required. |
| E5-02 | Owner | Close project | Apply disabled; read-only for visitors; can reopen. |
| E5-03 | Member | Post project update | Members see in Team Space; non-members denied. |
| E5-04 | Member | Manage simple tasks | Create task; mark done; visible to members. |
| E7-01 | User | Report project or user | Report stored; confirmation; platform moderator sees in moderation queue. |
| E7-02 | System | Enforce publish quality gate | Block publish if missing required fields; highlight sections. |
| E1-01 | User | Create account and log in | Sign up; log in; log out; private pages require login. |
| E1-02 | Builder | Maintain lightweight profile | Skills, links, availability; visible to creators in applications. |
| E6-04 | Builder | Save a search | Saved search appears in list; clicking applies same filters. |

---

## 14. Definition of Done (MVP)

- All P0 stories implemented with passing automated tests where applicable.
- Key flows validated: publish → discover → apply → offer → accept → active.
- No critical accessibility blockers in core flows.
- Basic anti-spam controls (rate limiting + publish gate) enabled.
- Instrumentation for north-star and supporting metrics.

---

## 15. AI Layer

### 15.1 Purpose

The AI Layer increases the likelihood that projects reach **Active** status by:

- Improving project clarity at creation
- Increasing match quality
- Raising application quality
- Supporting recruiting decisions
- Helping teams execute

### 15.2 AI Design Principles

- **Execution-first** — AI increases shipping, not chatting.
- **Structured augmentation** — AI enhances fields; does not replace them.
- **Context-aware suggestions** — Based on project type, role, stage.
- **Human-in-the-loop** — No autonomous hiring; humans decide outcomes.

### 15.3 AI Features by Area

| Area | AI Feature | Description |
|------|------------|-------------|
| **Project Creation** | Project Structuring Assistant | Rewrites/sharpen pitch; clarifies problem/solution; suggests expectations; improves reward framing. |
| **Project Creation** | Role Generator | Suggests missing roles; recommends skills; estimates time commitments; suggests compensation ranges. |
| **Discovery** | Smart Match Score | Skills alignment, availability compatibility, compensation preference, past participation patterns. |
| **Application** | Application flow | Improves message clarity; prompts addressing commitment; suggests portfolio additions. |
| **Recruiting** | Recruiting management | Applicant summaries; role-fit analysis; availability alignment. *Does not auto-decide outcomes.* |
| **Publish** | Quality gate | Project Clarity Score; flags vague scope or unrealistic expectations. |
| **Team Space** | Execution support | Summarizes discussions; extracts action items; suggests milestones; detects inactivity patterns. |

### 15.4 AI Monetization

| Tier | Features |
|------|----------|
| **Free** | Basic structuring suggestions; limited match scoring. |
| **Pro** | Advanced match scoring; recruiting assistant tools; project health diagnostics. |

### 15.5 AI MVP Boundaries

- No autonomous hiring decisions
- No payment automation
- No complex predictive reputation scoring

### 15.6 AI Data & Privacy

- Define what data is sent to the LLM (e.g. pitch text, role description, application message) and ensure it is minimal and documented.
- No storage of raw prompts/responses for training third-party models unless user consent and policy allow; prefer provider terms that do not train on customer data.
- Project Clarity Score and match scores: define whether they are computed on-demand or cached; document inputs for transparency.

---

## 16. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma |
| Auth | TBD (NextAuth or custom) |
| AI | TBD (OpenAI / Anthropic API) |

---

## 17. Open Questions

- Pick initial positioning: **Startup** vs **Creative** focus.
- ~~Should Active projects remain open to recruiting by default?~~ **Decided: Yes** — Active projects can continue recruiting for new roles by default.
- What are the minimum trust signals required before allowing a project to publish?
- ~~Will compensation terms be fixed fields only or allow free-text addenda?~~ **Decided: Yes** — Allow free-text addenda in addition to fixed fields.
- ~~Do we support multi-owner projects at MVP?~~ **Decided: No** — single owner only at MVP.
- Which notification channels for MVP (in-app only vs in-app + email)?

---

## 18. Spec Review Notes & Suggestions

*Summary of review and changes applied to this spec.*

### Additions made in this version

- **Glossary** — Definitions for Creator, Builder, Member, statuses, and quality gate so all readers share the same language.
- **Publish quality gate checklist** — Explicit minimum required fields to publish (pitch, expectations, reward, roles, owner); implementation will define exact validation.
- **Status lifecycle** — Clarified that transition to Active requires at least one member besides the owner.
- **Application flow** — Clarified application statuses, “request more info,” and that Offer is a distinct step with terms snapshot.
- **Project stage** — Noted that stage (e.g. Idea / Validation / Building / Launched) is for filters and display; enum to be fixed in implementation.
- **Notifications** — Added as NFR: in-app for MVP; email scope to be defined.
- **Permission table** — “Members only” clarified to “Project members only.”
- **AI data & privacy** — New subsection: what data is sent to the LLM, no training on customer data, and how Clarity Score / match scores are computed and documented.

### Suggestions for implementation

1. **Resolve open questions early** — Especially “Startup vs Creative” positioning and “multi-owner at MVP”; they affect copy, onboarding, and schema.
2. **Define project stage enum** — Use a fixed set (e.g. Idea, Validation, Building, Launched) in the data model and filter UI.
3. **Publish checklist in UI** — Show a visible checklist on the Review step (e.g. “Pitch ✓, Roles ✓, Reward ✗”) so creators know why Publish is disabled.
4. **Offer as first-class entity** — Model Offer with a snapshot of role + commitment + reward at offer time so terms are clear even if the project is later edited.
5. **Audit trail** — Log status changes and offer create/accept/decline with actor and timestamp for safety and support.
6. **AI: scope Phase 2** — Implement core product and flows first; add AI features incrementally (e.g. structuring assistant first, then match score) with feature flags.

---

## 19. References

- `Requirements Projektor.pdf` — Full PRD, IA, user stories
- `Requirements AI projektor.docx` — AI layer specification
- `PLAN.md` — Implementation plan and phase order
