# Test Report: Portal Design Details / share Add-to-request quantity parity (TD-030)

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-08-16-portal-details-share-add-to-request-quantity-parity-plan.md |
| Implementation | `ShareDesignPortalPageContent.tsx` + `CatalogDesignDetailsRequestQty.test.ts` (PR #79 / `fix/td-030-share-qty-parity`) |
| Overall | **passed** |

---

## Summary

Automated Portal checks for this goal passed. Initial owner DEV QA failed because the DEV customer’s continuable Working Request was `studio_customer` (not Portal-editable). DEV data repair archived `XlqFwbSoO0ZlAXMiDk8N`. Owner retest returned `DEV TD-030 QA: PASS`. Signoff is **approved**. Production has not been deployed.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Lint | `npm run lint` | 0 | pass | |
| Unit tests | `npx tsx --test apps/portal/features/catalog/components/CatalogDesignDetailsRequestQty.test.ts` | 0 | pass | 14/14 including new share-page suite |
| Build | `npm run build:portal` | 0 | pass | `/share/design/[id]` remains dynamic (`ƒ`) |
| `git diff --check` (goal files) | `git diff --check --` [plan/review/state/share page/test] | 0 | pass | Full-tree `--check` still flags pre-existing cutover whitespace (out of scope) |
| Integration | — | — | skip | Not in scope |
| E2E | — | — | skip | Not in scope |
| Backend/rules | — | — | skip | No backend change |

---

## Failures (if any)

None in automated checks.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Integration / E2E / rules | Plan: Portal UI wiring only; no Functions/Rules/schema |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner DEV QA (Details + share qty parity) | pass | `DEV TD-030 QA: PASS` after DEV data repair |

Manual test instructions: see checkpoint.

---

## Recommendations

- Live `myprintrequest.com` still has the original share CTA until a later App Hosting rollout (after owner merge of PR #79 + `AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY`).

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete
- [x] Signoff **approved**

**Next step:** owner pre-merge audit of PR #79; no App Hosting until authorized
