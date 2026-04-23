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

**Phase 1 (before public launch)**
- Add `visibility` field per project: `Public` / `NDAGated` / `InviteOnly`
- Split project content into `publicSummary` + `protectedPitch`
- NDA click-through with logging table (`IdeaAccess`)
- Server-side signed snapshots of project content on each update

**Phase 2 (post-launch, if needed)**
- Watermarked previews
- Copy-protect UI on sensitive fields
- Report-and-investigate flow

**Phase 3 (later)**
- Collaborator agreement templates (Uma & a lawyer draft a Hebrew +
  English SAFE-style collaborator agreement users can send to new
  teammates with one click)

## Schema sketch

```prisma
enum ProjectVisibility {
  Public
  NDAGated
  InviteOnly
}

model Project {
  // existing fields...
  visibility       ProjectVisibility @default(NDAGated)
  publicSummary    String?  // always visible
  protectedPitch   String?  // problem, solution, approach (NDA+)
  membersOnlyNotes String?  // shown only after acceptance
}

model IdeaAccess {
  id          String   @id @default(cuid())
  projectId   String
  viewerId    String
  snapshotHash String   // sha256 of the version viewed
  ndaVersion  String
  agreedAt    DateTime @default(now())

  @@index([projectId])
  @@index([viewerId])
}
```

## Open questions for Uma
- Default visibility for new projects: `Public` (more discoverability,
  less protection) or `NDAGated` (more protection, more friction)?
  Recommendation: **NDAGated**, with a "Make public" switch for
  owners who explicitly want wide attention.
- Do we also want invite-only projects from day one, or add that later?
- Should the NDA be one platform-wide text, or customizable per
  project? Recommendation: one well-drafted platform NDA for now.
