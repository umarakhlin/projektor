# Projektor — Post-Launch Plan (2 Weeks)

This plan starts immediately after MVP launch and focuses on stability first, then quality expansion.

---

## Week 1 — Stabilization

### Day 1-2: Launch monitoring and fast triage

- Monitor auth/session failures, `POST /api/applications`, and 5xx rates.
- Track any Day-0 incidents and decisions in `RELEASE_DECISION.md`.
- Prioritize and classify issues:
  - P0: service broken / data risk
  - P1: critical user flow broken
  - P2: serious UX degradation

### Day 3: Critical test hardening

- Add 2-3 automated tests for submission integrity:
  - retry behavior
  - duplicate-write prevention
  - expected error handling

### Day 4: Error UX expansion

- Replace silent empty fallbacks on secondary pages with explicit error states.
- Add lightweight retry actions where appropriate.

### Day 5: Bug-fix batch

- Fix all open P0/P1 and top P2 items discovered during Week 1.
- Run regression tests after fixes.

---

## Week 2 — Quality Expansion

### Day 1-2: E2E for secondary journeys

- Cover key non-primary flows:
  - profile update flow
  - saved projects flow
  - team space updates/tasks actions

### Day 3: Observability baseline

- Create dashboards for:
  - auth success/failure rates
  - application create success/error rates
  - rate-limit (`429`) volume

### Day 4: Alerting baseline

- Add minimum alerts for:
  - abnormal 5xx spikes
  - sustained auth failure spikes
  - critical application-create failure spikes

### Day 5: Retro and next sprint scope

- Review launch + post-launch outcomes.
- Document what worked, what broke, and top lessons.
- Produce prioritized next sprint backlog.

---

## Definition of Done (End of Week 2)

- No open P0/P1 launch-related defects.
- Automated coverage improved for critical and selected secondary flows.
- Dashboards and alerts active for launch-critical health signals.
- Clear, prioritized backlog ready for the next sprint.

---

## Ownership Template

- Product owner:
- Engineering lead:
- QA owner:
- Ops/incident owner:

## Tracking

- Start date:
- Target end date:
- Status:
- Notes:
