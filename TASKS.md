# Projektor — Task Tracker

Live working backlog. When something is done, move it to "Recently done".
Keep this file short — deep context lives in `docs/`.

---

## 🔴 High priority — must finish soon

### 1. DM email notifications (blocked — Resend sandbox)
- Cron, endpoint, dedupe and schedule are all working end-to-end.
- Current blocker: Resend's test mode only lets us email
  `uma.rakhlin@gmail.com`. Our test accounts use other addresses, so
  Resend returns 403.
- **Recommended fix**: switch to Brevo (free, 300 emails/day, single
  sender verification without owning a domain).
  - Sign up at brevo.com
  - Verify `uma.rakhlin@gmail.com` as a sender (one click in the app)
  - Create an API key
  - Replace `src/lib/email.ts` so it uses the Brevo API (~10 min)
  - Add `BREVO_API_KEY` to Vercel env vars
  - Remove / keep `RESEND_API_KEY` as fallback
- Alternative long-term: buy a domain, verify it in Resend, set
  `EMAIL_FROM=notifications@yourdomain.com`.

### 2. Intellectual-property protection (see `docs/ip-protection.md`)
- Right now all project pitches are publicly visible, which is risky.
- Decision pending: pick one of the proposed visibility models.

### 3. Monetization plan (see `docs/monetization.md`)
- No revenue model yet. Pick a direction before launch.

---

## 🟡 Medium priority — nice to have soon

- **Profile pictures on Talent cards** (currently initials only).
- **"My invites" page** — one place to see/accept/decline invites received.
- **Real-time unread badge in chat** (right now polling every 8 s).
- **Onboarding flow for new users** — guided setup for skills, photo,
  availability so match score has data to work with from day one.

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
