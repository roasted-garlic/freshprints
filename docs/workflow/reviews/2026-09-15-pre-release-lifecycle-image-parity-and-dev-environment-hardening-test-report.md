# Test Report: Pre-release lifecycle, image parity, and DEV environment hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-plan.md` |
| Formal Review | `approved_with_changes` + owner C robots correction |
| A Diagnostic | `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-a-diagnostic.md` — **H1-class** |
| Overall | **pending_manual** (automated **passed_with_notes**) |

---

## Summary

Implement completed for Workstreams A–C on `development`. Focused automated suites **76/76 PASS**. Functions build, Portal typecheck, Studio typecheck, and `git diff --check` pass. Portal `next build` hit the known Windows `.next/trace` EPERM while a Portal process holds files — documented, not treated as a product failure. Owner DEV QA is required before Signoff. Production IAM / deploy remains unauthorized.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Focused unit/contract | `npx tsx --test` (A/B/C suite list below) | 0 | **pass** | **76/76** |
| Functions build | `npm --prefix functions run build` | 0 | **pass** | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **pass** | |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio`) | 0 | **pass** | |
| `git diff --check` | `git diff --check` | 0 | **pass** | CRLF warnings only |
| Portal build | `npm run build:portal` | 1 | **skip / env blocker** | `EPERM` on `apps/portal/.next/trace` (known Windows + running Portal) |
| Rules tests | — | — | **skip** | Rules out of scope |
| Full lint | — | — | **skip** | Not required for this focused pass; typecheck covered changed apps |

### Focused test command (76/76)

```bash
npx tsx --test \
  functions/src/lib/staffGangSheetShowFinishReconciliation.behavior.test.ts \
  functions/src/completeStaffGangSheetAndOpenNext.contract.test.ts \
  functions/src/getPortalAdminShowQueueRequestDesigns.preview.contract.test.ts \
  apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueueStaffGangSheetUi.contract.test.ts \
  apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.staffGangSheet.contract.test.ts \
  packages/shared/src/utils/printRequestCompletionEligibility.test.ts \
  packages/shared/src/utils/printRequestListGrouping.test.ts \
  apps/portal/features/brand/portalSearchIndexing.test.ts \
  apps/portal/features/brand/portalDevIndexing.contract.test.ts \
  apps/portal/features/brand/portalSiteMeta.test.ts \
  apps/portal/features/help/utils/portalHelpMeta.test.ts \
  apps/portal/features/catalog/services/portalDesignShareMetaService.test.ts
```

---

## Implementation notes by workstream

### A
- DEV diagnostic: only open Internal Gang Sheet #2; allocations still `pending`; classification **H1-class** (finish never landed on current DEV data). No eligibility semantic change.
- Hardening: return `reconciledPrintRequestIds`; Studio best-effort `syncPrintRequestQueueTab` after complete; `clearPrintRequestsPageCache` after Mark Complete; behavioral finish→Printed tests.

### B
- Portal Admin View Designs: log + `previewUnavailableReason` (`signing_failed` / `missing_object` / `staff_artwork_not_previewed` / `unresolved`). Staff Artwork left intentionally blank. No production IAM mutation.

### C
- Banner in root layout; dual gate; sticky danger strip; exact text `THIS IS A DEVELOPMENT SERVER`.
- Disabled robots pack: noindex/nofollow/noarchive/nosnippet; `X-Robots-Tag` middleware; empty sitemap when indexing disabled; DEV `robots.txt` **Allow: /** (not Disallow:/).

---

## Failures (if any)

### Portal build EPERM
- **Command:** `npm run build:portal`
- **Output excerpt:** `EPERM: operation not permitted, open '.../apps/portal/.next/trace'`
- **In scope to fix:** no (environment)
- **Action taken:** Documented; Portal typecheck + SEO contract tests cover metadata/robots/sitemap/middleware wiring

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Rules tests | No Rules changes |
| Production View Designs smoke | Separately gated; no prod IAM/mutation authorized |
| Full monorepo lint | Focused typecheck + unit coverage used instead |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner DEV QA (A–C checklist) | **pending** | See DEV QA preparation doc |

Manual test instructions: `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-dev-qa-preparation.md`

---

## Signoff Readiness
- [x] Required automated checks pass OR failures documented
- [ ] Manual Owner DEV QA complete
- [ ] Ready for signoff phase — **blocked on Owner DEV QA**

**Next step:** manual-test-checkpoint (Owner DEV QA)
