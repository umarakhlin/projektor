# Release Decision Checklist

Use this file at release cut. Mark each gate with owner and timestamp.

Release date:
Release version:
Environment:
Incident timebox for hotfix:
Rollback owner: Engineering on-call lead
On-call contact:

---

## Team Role Defaults (edit names)

- Product owner: `TBD`
- Engineering lead: `TBD`
- QA owner: `TBD`
- SRE/DevOps owner: `TBD`
- Incident commander (Day-0): `TBD`

---

## 1) Must-Have Gates (All Required)

### A. Core Smoke Journey

- [ ] Auth -> valid session -> submit application -> success confirmation passes end-to-end
  - Owner: QA owner
  - Timestamp:
  - Evidence (link/log/screenshot):

### B. Critical API Gate

- [ ] Auth/session checks pass on launch-critical paths
  - Owner: Engineering lead
  - Timestamp:
  - Evidence:

- [ ] `POST /api/applications` write path checks pass
  - Owner: Engineering lead
  - Timestamp:
  - Evidence:

### C. Defect Gate

- [ ] No open P0/P1 defects in auth/session paths
  - Owner: Product owner
  - Timestamp:
  - Evidence:

- [ ] No open P0/P1 defects in submission integrity paths
  - Owner: Product owner
  - Timestamp:
  - Evidence:

### D. Data Integrity Gate

- [ ] No unresolved duplicate-write behavior on submission retries
  - Owner: Engineering lead
  - Timestamp:
  - Evidence:

- [ ] No unresolved partial-write behavior on submission retries
  - Owner: Engineering lead
  - Timestamp:
  - Evidence:

### E. Operational Gate

- [ ] Rollback owner confirmed and reachable for launch window
  - Owner: Incident commander
  - Timestamp:
  - Evidence:

- [ ] On-call coverage confirmed for launch window
  - Owner: SRE/DevOps owner
  - Timestamp:
  - Evidence:

---

## 2) Explicit NO-GO Conditions

If any condition below is true, launch is NO-GO:

- [ ] Core smoke journey fails and cannot be fixed quickly
- [ ] Submission path shows data loss, duplicate creation, or inconsistent state
- [ ] Auth failures cause user lockout or sign-in loop in launch flow
- [ ] Any critical checklist item is unverified or skipped

Decision owner: Product owner
Decision timestamp:
Notes:

---

## 3) Day-0 Rollback Triggers

Trigger rollback immediately if any appears:

- [ ] Data integrity breach (duplicate or partial submissions)
- [ ] Sustained auth/session failures blocking core flow
- [ ] Repeated 5xx spikes on launch-critical endpoints with user impact
- [ ] Core auth + submission journey is broken at unacceptable success rate
- [ ] No verified hotfix within incident timebox

Rollback initiated by: Incident commander
Rollback timestamp:
Customer-impact notes:

---

## 4) Final Release Decision

- [ ] GO
- [ ] NO-GO

Final approver: Product owner + Engineering lead
Final timestamp:
Launch notes:

---

## 5) Deferred Items (Post-Launch)

- [ ] Broader non-critical API test expansion
- [ ] Deeper observability (dashboards/alerts tuning)
- [ ] Wider E2E coverage for secondary journeys
- [ ] Non-launch-critical auth/system refactors
- [ ] Performance tuning outside launch-critical regressions

Owner: Engineering lead
Target week:
