# Signoff: Production Algolia Gate C — Portal enable

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Managed goal | `pr-40-prod-algolia-gate-c-enable` |
| Plan | `docs/workflow/plans/2026-08-09-prod-algolia-gate-c-enable-plan.md` |
| Formal Review | **approved** |
| Status | **approved_with_notes** |

---

## Summary

Production Portal managed catalog search is **ON** against SEPARATE Algolia app `Z1FVCM5QUX` / index `portal_catalog_ready_prod` (reconciled 46/46), using search-only App Hosting secrets, tip `f5c0bdb` (PR #49), live **100%** `build-2026-08-09-001`. Owner QA **PASS** with one deferred non-blocking UX note.

---

## Delivered

| Step | Evidence |
|------|----------|
| C-reconcile | Apply 46/46 cleared — `…-prod-algolia-gate-c-reconcile-apply-record.md` |
| Secrets | `ALGOLIA PORTAL SECRETS: READY` — names verified |
| Source | PR #49 @ `f5c0bdb` — Algolia `secret:` refs in `apphosting.yaml` |
| Rollout | `PROD ALGOLIA ENABLE ROLLOUT: COMPLETE` — `build-2026-08-09-001` 100% |
| QA | `PROD ALGOLIA ENABLE QA: PASS` |

### Files (enable lane)

- `apps/portal/apphosting.yaml`
- `apps/portal/.env.example`
- `docs/standards/DEPLOYMENT.md`
- Workflow plans/reviews under `docs/workflow/`

---

## Tests / verification

| Check | Result |
|-------|--------|
| Secret names present (no values read) | PASS |
| Tip contains Algolia secret refs | PASS |
| App Hosting traffic 100% new build | PASS |
| Owner search QA | **PASS WITH NOTES** |

---

## Manual tests / human approvals

| Item | Result |
|------|--------|
| `APPROVE PROD ALGOLIA ENABLE` | Given |
| Search-only key + secrets (no values in chat) | READY |
| Source promote / rollout | PASS / COMPLETE |
| `PROD ALGOLIA ENABLE QA: PASS` | **PASS** |

### Owner note (deferred)

When transitioning to a filtered catalog view, Portal briefly shows full-screen **“Loading your account...”**. Functionality correct; polish deferred → **TD-032**.

---

## Risks / follow-ups

| Item | Status |
|------|--------|
| TD-032 catalog filter → account loading flash | open (low / ui polish) |
| Kill-switch | flag secret `false` + rollout |
| Admin key must never ship to Portal | enforced by process |

---

## Final status

**approved_with_notes** — Gate C-enable **CLOSED**. Managed search live on production Portal.
