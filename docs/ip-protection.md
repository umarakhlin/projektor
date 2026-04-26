# Protecting project owners' ideas

The concern: Projektor asks owners to publish a problem, pitch, and
role requirements. Someone could read it all, copy the idea, and
build it alone. We need to give owners real tools to feel safe —
otherwise the best ideas never get posted.

## The honest truth
You cannot technically prevent someone from reading public text and
remembering it. The legal system also won't help much with raw ideas
(ideas are not copyrightable — only concrete expression is).

So our job is **not** "make copying impossible". Our job is:
1. Let owners choose **how much** to reveal publicly.
2. Create a **paper trail** (who saw what, when, under what terms).
3. Gate the most valuable details behind a relationship (application,
   membership).
4. Establish strong community norms that stealing is socially costly.

## Proposed model — tiered visibility

Every project has three layers of information:

| Layer                  | Who sees it                                    |
|------------------------|------------------------------------------------|
| **Public card**        | Anyone — title, short hook, category, stage    |
| **Under NDA preview**  | Visitors who accept a click-through NDA        |
| **Members-only**       | Applicants whose application has been accepted |

### Public card (always visible)
- Project title
- One-sentence hook (100 chars)
- Category, stage, team size needed
- General role titles and skill tags
- Creator's name + avatar (trust signal)

### NDA preview (click to unlock)
- Full pitch, problem statement, value prop
- Rough approach / what's been tried
- Role details — commitment, reward model
- Each unlock logs: viewer userId, timestamp, IP hash, a signed
  snapshot of the NDA text they agreed to
- Unlock requires being signed in (we know who they are)

### Members-only (after acceptance)
- Concrete implementation plans, designs, customer lists
- Current product/code repo links
- Internal task board, updates, chat

## Other defenses (layered)

### Public timestamping / "proof of prior art"
- Every project's public + NDA content gets a server-signed hash
  stamped at creation.
- If an owner later suspects theft, we can produce the exact original
  text with a signed timestamp. Weak legally in Israel but valuable
  for social pressure.

### Watermarked previews
- Insert a near-invisible unique marker into each viewer's NDA
  preview (e.g. a zero-width space pattern or a unique phrasing
  rotation).
- Later we can look at a leaked copy and identify who leaked it.
- Non-obvious, no UX cost.

### Screenshot / copy deterrent
- Disable right-click + text selection on NDA preview (trivially
  bypassed but raises friction and signals "this is confidential").
- Add a visible "Shared under NDA with <viewer name>" watermark
  overlay. Strong psychological deterrent against sharing the
  screenshot.

### Report & takedown workflow
- If an owner sees a suspicious duplicate elsewhere:
  - "Report IP theft" form in-app
  - We use the access log + signed original to investigate
  - If another Projektor user is behind it → ban + public notice
  - If external → we help the owner draft a cease-and-desist

### Norms / terms of service
- Registration requires agreeing: "I will not use ideas from projects
  I did not join, except as inspiration for my own work."
- Ban for violators. First case becomes a public precedent.

## Implementation phases

**Phase 1 — DONE (April 2026)**
Per Uma's request, the NDA is platform-wide and re-affirmed on every
sign-in (not per-project click-through). What ships:
- `Project.visibility` enum: `Public` / `NDAGated`. Existing rows
  defaulted to `NDAGated` via migration.
- Owner picks visibility in the create flow (defaults to `NDAGated`).
- `User.lastNdaAcceptedAt` and `NdaAcceptance` audit table.
- `/api/me/accept-nda` records each click-through with NDA version,
  IP hash, user agent.
- JWT carries `sessionStartedAt`. Server-side check in `lib/nda.ts`:
  if `lastNdaAcceptedAt` is older than `sessionStartedAt`, the NDA is
  required.
- Client-side `<NdaGate />` (mounted in the root layout) fetches
  `/api/me/nda-status` and redirects authenticated users to `/nda`
  whenever their session has not yet acknowledged the NDA.
- Project detail page shows a small "Confidential — viewing under
  NDA" banner for non-owners on `NDAGated` projects.
- NDA wording version is in `lib/nda.ts` (`NDA_VERSION`); bumping it
  forces every user to re-accept on next sign-in.

**Phase 2 (next, if needed)**
- Split project content into `publicSummary` + `protectedPitch` so
  signed-out visitors can only see the public summary.
- Per-project access log (which signed-in user opened which project,
  when, what NDA version).
- Server-side signed snapshots of project content on each update for
  prior-art proofs.
- Watermarked previews, copy-protect UI, report-and-investigate flow.

**Phase 3 (later)**
- Collaborator agreement templates (Uma & a lawyer draft a Hebrew +
  English SAFE-style collaborator agreement users can send to new
  teammates with one click).

## Current schema (Phase 1 shipped)

```prisma
enum ProjectVisibility {
  Public
  NDAGated
}

model Project {
  // existing fields...
  visibility ProjectVisibility @default(NDAGated)
}

model User {
  // existing fields...
  lastNdaAcceptedAt DateTime?
  ndaAcceptances    NdaAcceptance[]
}

model NdaAcceptance {
  id         String   @id @default(cuid())
  userId     String
  ndaVersion String
  agreedAt   DateTime @default(now())
  ipHash     String?
  userAgent  String?
}
```

## Decisions logged
- **Default visibility**: `NDAGated` for every new project; owners can
  switch to `Public` in the create flow.
- **NDA cadence**: re-affirmed on every sign-in. UX is a redirect to
  `/nda` after the user authenticates and before they can browse.
- **NDA scope**: one platform-wide text (`NDA_VERSION` in
  `lib/nda.ts`). Per-project NDAs can be added in Phase 2.
- **`InviteOnly` visibility**: not in Phase 1; revisit if we see
  real demand.

## Open questions for Phase 2
- Do we need to split content into a public summary + protected
  pitch for signed-out visitors? Today, the NDA gate only fires once
  the user is signed in.
- Per-project access log: do owners want to see "who viewed my
  project"? If yes, we add an `IdeaAccess` table at that point.
