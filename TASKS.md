# Projektor — Task Tracker

Live working backlog. When something is done, move it to "Recently done".
Keep this file short — deep context lives in `docs/`.

---

## 🔴 High priority — must finish soon

### 1. Intellectual-property protection — Phase 2 (see `docs/ip-protection.md`)
- Phase 1 is live: every sign-in shows a confidentiality acknowledgement
  before the user can browse, every project defaults to NDA-gated, and
  the project page shows a small "Confidential" reminder for
  non-owners.
- Phase 2 ideas to discuss:
  - Public summary vs. protected pitch (split fields).
  - Per-project NDA records (not just platform-wide), so owners can see
    who acknowledged what.
  - Watermark / "viewed by" log on each project page.
  - Owner-side controls for revoking access.

### 2. Monetization plan (see `docs/monetization.md`)
- No revenue model yet. Pick a direction before launch.

### 3. Email deliverability on a real domain (not urgent, eventually)
- DM notifications work via Brevo with a gmail.com sender.
- Because gmail.com can't be DMARC-authenticated by us, some mail
  providers may route our emails to spam.
- When launching publicly: buy a domain, verify it in Brevo (or
  switch to Resend), set `EMAIL_FROM=notifications@yourdomain.com`.
- No code change required at that point.

---

## 🟡 Medium priority — nice to have soon

- **"My invites" page** — one place to see/accept/decline invites received.

---

## 🟢 Low priority / ideas

- Last-seen indicator per user.
- Project tags / categories in Explore with filters.
- Stats dashboard for project owners (views, applicants, match rate).
- PWA support + push notifications.
- Verified badge for users who complete onboarding fully.
- Bookmark talent for later.

---

## ✅ Recently done

- IP protection Phase 1: per-sign-in NDA gate. Every session redirects
  to `/nda` until the user accepts. Acceptances are logged
  (`nda_acceptances` table) with version, timestamp, IP hash, UA. New
  `Project.visibility` enum (`Public` / `NDAGated`, default
  `NDAGated`). Project detail page shows a small confidential reminder
  banner for non-owners on NDA-gated projects. Visibility selector in
  the create flow.
- Real-time unread badge: BroadcastChannel between Messages page and
  header, faster polling (5s) when tab visible, instant refresh on
  open/send.
- Onboarding wizard at `/welcome`: 3 steps (name+photo, skills,
  availability), each saves immediately, can be skipped. Dismissable
  reminder banner on home feed. Email verification now routes through
  `/welcome`.
- Merged Talent into Explore as a tabbed page (`Projects` | `People`),
  driven by `?tab=`. `/talent` redirects for back-compat. Single
  Explore entry point in the nav.
- DM email notifications end-to-end: Brevo API integration, Gmail
  sender verified, `BREVO_API_KEY` + `EMAIL_FROM` in Vercel,
  verified emails actually arriving to recipients.
- Accessibility widget (text size, dyslexia font, bionic reading,
  high contrast, reduce motion, underline links, readable spacing).
- WhatsApp-style chat: dedicated `/messages/[userId]` page with
  bubbles, auto-scroll, inline send.
- Inbox shows conversation list instead of expanded messages.
- Unread DM badge in header, `/api/me/unread-messages`.
- DM email notification pipeline (cron via GitHub Actions, dedupe,
  cooldown, opt-out). Blocked on Resend sandbox, see above.
- Talent page with match score, skill/role filters, direct invites
  and "Send message" link.
- Sentry error monitoring.

---

## Ways to add tasks

- Quick note → paste it under the matching priority section.
- Longer idea → make a file in `docs/` and link to it here.
- When a task is done → move the line to "Recently done" with date
  not needed; git history is enough.
