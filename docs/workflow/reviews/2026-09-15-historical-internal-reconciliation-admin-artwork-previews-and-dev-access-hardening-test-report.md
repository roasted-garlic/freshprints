# Test Report: Historical Internal reconciliation, Admin artwork previews, and DEV access hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-15-historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening-plan.md` |
| Formal Review | `approved_with_changes` + owner Implement→Test authorization |
| Overall | **passed** (automated **passed_with_notes**; Owner DEV QA **PASS**) |

---

## Summary

Implement completed for Workstreams A–C on `development`. Focused automated suites passed; Functions + Rules deployed to `fresh-prints-dev`. Owner DEV QA is required before Signoff.

**DEV Portal hosting correction (2026-09-15):** Portal QA uses **localhost `:3100`** and the **`myprintrequest.dev` tunnel** to that process. There is **no** DEV App Hosting publish step for this goal. App Hosting publication is only for eventual **production** Portal promotion (`myprintrequest.com`), separately gated.

**Overlay acknowledgement correction (2026-09-15):** Overlay appears on **every** `/login` and `/register` visit (visit-only dismiss; not sessionStorage).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Focused unit/contract | `npx tsx --test` (suite list below) | 0 | **pass** | **50/50** |
| Functions build | `npm --prefix functions run build` | 0 | **pass** | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **pass** | |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio`) | 0 | **pass** | Fixed `replaceAll` → `replace(/_/g," ")` |
| Targeted lint | `npx eslint` on changed A/B/C files | 0 | **pass** | Full-repo lint still has pre-existing unrelated errors |
| `git diff --check` | `git diff --check` | 0 | **pass** | |
| Portal build | `npm run build:portal` | 1 | **skip / env blocker** | `EPERM` on `apps/portal/.next/trace` (known Windows + running Portal) |
| Rules | `tests/firebase/portalDevCustomerAccess.rules.contract.test.ts` | 0 | **pass** | Contract coverage for new settings doc; full emulator suite not re-run |

### Focused test command (50/50)

```bash
npx tsx --test \
  packages/shared/src/constants/portal/portalDevCustomerAccess.constants.test.ts \
  functions/src/lib/portalDevCustomerAccess.test.ts \
  functions/src/lib/internalGangSheetHistoricalReconciliation.contract.test.ts \
  functions/src/getPortalAdminShowQueueRequestDesigns.preview.contract.test.ts \
  functions/src/registerCustomer.devAccess.contract.test.ts \
  apps/portal/features/brand/portalSearchIndexing.test.ts \
  apps/portal/features/auth/portalDevAccess.contract.test.ts \
  apps/studio/src/renderer/src/features/upcoming-shows/components/InternalGangSheetHistoricalReconciliationDialog.contract.test.ts \
  apps/studio/src/renderer/src/features/settings/components/PortalDevCustomerAccessSettingsSection.contract.test.ts \
  tests/firebase/portalDevCustomerAccess.rules.contract.test.ts
```

---

## Workstream coverage

| Stream | Automated coverage |
|--------|-------------------|
| **A** | Preview no-writes; reuse finish/reconcile; no new cycle; owner-only callables; History UI + permission gate |
| **B** | Staff Artwork derivative paths; no `staff_artwork_not_previewed`; no production path; signing_failed / missing_object honesty |
| **C** | Overlay DEV project gate + localhost/tunnel host check; visit-only ack (every /login|/register); allowlist normalize/dedupe; registerCustomer gates; prod short-circuit; Rules contract; Studio Settings section |

---

## Notes / risks

1. **DEV Functions/Rules:** Deployed to `fresh-prints-dev` for QA. **Portal:** local `:3100` + `myprintrequest.dev` tunnel — **no** DEV App Hosting publish.
2. **Auth orphans:** unapproved users may still create Firebase Auth identities; application provisioning/session is denied. GCIP blocking remains out of scope.
3. **Production IAM (B):** not mutated; if DEV Admin Staff Artwork previews work and prod still fails with TokenCreator/signBlob, record exact IAM action in Signoff Manifest then stop for separate checkpoint.
4. **Portal build EPERM:** known local Windows blocker when Portal is running; typecheck passed.
5. **Production Manifest (Signoff):** DEV overlay/access QA requires **no** App Hosting. Eventual production may require Portal App Hosting to `myprintrequest.com` — separately gated; do not invent a DEV App Hosting step.

---

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA A–C | **PASS** | Owner 2026-09-15 |

Overall after Owner DEV QA: **passed**.
