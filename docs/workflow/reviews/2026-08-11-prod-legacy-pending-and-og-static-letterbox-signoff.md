# Signoff: Legacy Pending recon tooling + Global OG Static letterbox (DEV)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-11-prod-legacy-pending-and-og-static-letterbox-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-11-prod-legacy-pending-and-og-static-letterbox-plan-review.md` (**approved_with_changes**) |
| Implementation Review | `docs/workflow/reviews/2026-08-11-prod-legacy-pending-and-og-static-letterbox-implementation-review.md` (**approved**) |
| Test report | `docs/workflow/reviews/2026-08-11-prod-legacy-pending-and-og-static-letterbox-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Owner replied **`DEV STATIC OG LETTERBOX QA: PASS`**. Track B Global OG Static letterbox corrective is cleared on `fresh-prints-dev`. Track A Admin reconciliation tooling is implemented and unit-tested; **production APPLY was not run** and remains separately gated.

---

## Changes Delivered

### Track A
- Bounded Admin dry-run/APPLY script + pure predicate guards
- Frozen allowlist; live allocation = non-canceled + `allocatedQuantity > 0`
- Status-only repair path: `pending_staff_review` → `not_eligible`

### Track B
- Static Global OG always letterboxes via `getPortalOgShareImage`
- Design Library Static → `designId`; Upload Static → validated `staticPath`
- Logo fail-safe (never raw artwork URL)
- Studio copy + DATA_MODEL / BACKEND / DEPLOYMENT updates
- DEV Functions deploy: `getPortalGlobalOpenGraph`, `getPortalOgShareImage`

### Docs
- A–H DEV QA signoff amended (historical PASS ≠ Static letterbox); Track B QA now PASS

---

## Tests

| Check | Result |
|-------|--------|
| Track A predicates | **18/18** |
| Track B + OG focused | **26/26** |
| Functions build | **pass** |
| Studio typecheck | **pass** |
| Focused lint / diff-check | **pass** |
| Manual Static Design + Upload (Facebook Scrape Again) | **PASS** (owner) |

---

## Human Approvals

| Approval | Status |
|----------|--------|
| `APPROVE IMPLEMENT: LEGACY PENDING RECON TOOLING + GLOBAL OG STATIC LETTERBOX` | obtained |
| `DEV STATIC OG LETTERBOX QA: PASS` | obtained |
| `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR` | **not obtained** |
| A–H production promote | **not obtained** |

---

## Risks & follow-ups

| Item | Notes |
|------|-------|
| Uncommitted work on `qa/prefinal-a-h-dev` | Commit/push before any promote |
| Track A prod APPLY | After E Functions prod deploy + dry-run + owner phrase |
| A–H prod promote | Still owner-gated (Track B DEV blocker for Static OG is **cleared**) |

---

## Verdict

**approved_with_notes** — DEV Track B letterbox accepted; Track A tooling ready but unused against production. Notes: no prod APPLY; no A–H promote; commit before promote.

---

## Next owner phrases (not auto-run)

1. Commit/push QA + Track A/B work on `qa/prefinal-a-h-dev` when ready  
2. A–H production preflight / promote (separate phrase)  
3. After E on prod + freeze: dry-run, then `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`
