# Signoff: Portal Customer Username Change

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Signoff by | Managing Agent (owner QA recorded) |
| Plan | `docs/workflow/plans/2026-08-27-portal-customer-username-change-plan.md` |
| Review | `docs/workflow/reviews/2026-08-27-portal-customer-username-change-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-27-portal-customer-username-change-implementation-review.md` |
| DEV deploy | `docs/workflow/reviews/2026-08-27-portal-customer-username-change-dev-deploy-record.md` |
| Cooldown corrective deploy | `docs/workflow/reviews/2026-08-27-portal-customer-username-cooldown-corrective-dev-deploy-record.md` |
| Final status | **approved** |

---

## Owner closeout (2026-08-27)

Additional owner acceptance recorded during DEV work closeout: *"Everything so far is working good."* Goal remains **approved**; not reopened. Production promotion still deferred.

---

## Summary

Portal customers can self-service **display name** and **username** from Account Settings → Profile. Changes run through a shared canonical Firestore transaction (reservation swap, bounded `usernameHistory`, optional `users` mirror) with **30-day Portal username cooldown** (staff bypass). Identity snapshots propagate resumably to `printRequests` and `designIssueReports` with write-once at-creation fields; print request `name` values (e.g. `olduser-CR001`) remain immutable. Historical UI uses `@newname · was @oldname at submission` when snapshots differ.

Owner confirmed on **fresh-prints-dev**: *"This is working exactly how we want it to."*

---

## Changes Delivered

### Behavior
- Portal callable `updatePortalCustomerProfile` (self-only)
- Staff `updateCustomer` refactored to shared `applyCustomerProfileUpdate` + propagation
- Resumable `identitySnapshotPropagation` on customer doc (≤400 writes/batch)
- Shared `formatCustomerIdentityLabel` wired in Studio Print Requests + design issue submitter
- Portal Account Settings Profile section
- Username cooldown corrective: first change allowed when no prior username change history; signup no longer seeds cooldown via `usernameUpdatedAt`

### Documentation
- ADR-FP-148 (`docs/project/DECISIONS.md`)
- `DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md` updated

---

## Tests

### Automated
- Functions build: PASS
- 23 targeted unit tests: PASS (profile update, propagation old1→new1→new2, formatter, Portal validation)
- Portal typecheck: PASS
- Studio typecheck: pre-existing unrelated failures (not introduced by this goal)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Portal Profile (display name, username, cooldown, taken username) | **PASS** | Owner (2026-08-27) |
| Studio parity + historical formatter | **PASS** | Owner (2026-08-27) |
| Propagation / immutable CR names | **PASS** | Owner (2026-08-27) |
| Username cooldown corrective re-QA | **PASS** | Owner (2026-08-27) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | — | DEV-only scope; prod untouched |
| Database migration | not required | — | No migration |
| Design / UX | obtained | 2026-08-27 | Owner QA pass |
| Business / policy | obtained | 2026-08-27 | 30-day cooldown, immutable CR names |
| Secrets / env | not required | — | No env changes |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Portal Profile UI not on App Hosting | low | Run local Portal against DEV until hosting deploy |
| Production Functions not deployed | medium | Separate prod allowlist deploy when ready |
| Large-customer propagation timeout | low | Callable auto-resume; staff re-save resumes stale state |
| Studio unrelated tsc errors | low | Pre-existing; track separately |

---

## Deferred Items (Roadmap)

- Production deploy: `updatePortalCustomerProfile` + `updateCustomer` (+ cooldown corrective exports if bundled)
- Optional: Portal App Hosting deploy for Profile UI in hosted DEV/staging
- Optional: dedicated customer-facing propagation retry UX

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Implementation, DEV deploy, cooldown corrective, and owner QA complete on `fresh-prints-dev`. Production promotion remains a separate human-gated step.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] Signoff recorded
- [ ] `ROADMAP.md` — optional brief note (feature complete on DEV)
- [ ] `references/project-chatgpt-handoff/` — not present in repo

**Recommended next action for user:** When ready for production, approve a prod Functions allowlist deploy only (`updatePortalCustomerProfile`, `updateCustomer`, and any cooldown-related callables deployed in corrective). Optionally deploy Portal App Hosting when hosted DEV should expose Profile UI without local dev.
