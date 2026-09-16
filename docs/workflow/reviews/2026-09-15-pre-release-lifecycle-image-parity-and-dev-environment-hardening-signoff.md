# Signoff: Pre-release lifecycle, image parity, and DEV environment hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-plan.md` |
| Review | `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-test-report.md` |
| A diagnostic | `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-a-diagnostic.md` |
| DEV QA prep | `docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-dev-qa-preparation.md` |
| Final status | **approved_with_notes** |

---

## Summary

Closed the bounded pre-release bundle that restored Internal Gang Sheet Mark Complete → Printed on the forward DEV path, hardened Portal Admin View Designs preview failure honesty (Staff Artwork left blank by design for this goal), and made the DEV Portal unmistakably non-production with persistent banner + explicit noindex (crawlable robots so crawlers can see noindex). Owner DEV QA recorded **PASS WITH NOTES** (A note + B follow-up + C pass). No production mutation.

---

## Changes Delivered

### Behavior
- **A:** Mark Complete returns `reconciledPrintRequestIds`; Studio best-effort queueTab sync + Print Requests cache clear; behavioral finish→Printed tests. Forward path verified in Owner DEV QA.
- **B:** Admin View Designs logs signing failures and returns `previewUnavailableReason`; Staff Artwork intentionally blank for this goal.
- **C:** Sticky `THIS IS A DEVELOPMENT SERVER` banner; disabled robots pack (noindex/nofollow/noarchive/nosnippet); `X-Robots-Tag` middleware; empty DEV sitemap; DEV `robots.txt` Allow `/` (not Disallow `/`).

### Files Created (selected)
- `apps/portal/features/brand/components/PortalDevelopmentServerBanner.tsx`
- `apps/portal/middleware.ts`
- `apps/portal/features/brand/portalDevIndexing.contract.test.ts`
- `functions/src/lib/staffGangSheetShowFinishReconciliation.behavior.test.ts`
- `functions/src/getPortalAdminShowQueueRequestDesigns.preview.contract.test.ts`
- Workflow plan/review/diagnostic/test/DEV QA docs

### Files Modified (selected)
- `functions/src/completeStaffGangSheetAndOpenNext.ts`
- `functions/src/getPortalAdminShowQueueRequestDesigns.ts`
- Studio UpcomingShows Mark Complete path + contracts
- Portal SEO/meta/robots/sitemap/layout/shell + admin View Designs modal
- `docs/standards/DEPLOYMENT.md`, `docs/workflow/setup/firebase-signed-url-iam.md`

### Documentation Updated
- DEPLOYMENT SEO section (DEV noindex strategy)
- Signed-URL IAM doc related callables
- Workflow artifacts + handoff CURRENT-STATE / recent completed work

---

## Tests

### Automated
- Focused suites **76/76 PASS**
- Functions build PASS
- Portal typecheck PASS
- Studio typecheck PASS
- `git diff --check` PASS
- Portal `next build` **EPERM** on `.next/trace` (documented environment blocker)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA A–C | **PASS WITH NOTES** | Owner 2026-09-15 |

Owner notes recorded:
- **A:** Forward Mark Complete → Printed **PASS WITH NOTE** — production has historical completed Internal History sheets with Internal PRs still Queued; DEV clean so historical repair not exercised. Needs separate reconciliation capability.
- **B:** DEV source behavior passed; follow-up — View Designs must ultimately preview **all** artwork types including Staff Artwork; production parity still needs gated IAM/promotion/smoke.
- **C:** **PASS** — banner/noindex works. Accidental customer found DEV via Google → next goal covers DEV auth/access hardening.

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required / not authorized | | |
| Database migration | N/A | | |
| Design / UX | obtained (DEV QA) | 2026-09-15 | Banner + overlay follow-up deferred |
| Business / policy | obtained (C robots correction) | 2026-09-15 | Explicit noindex primary |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production historical Internal Queued after completed sheets | High (ops) | Next goal: historical reconciliation Preview→Apply |
| Staff Artwork blank in Admin View Designs | Med (ops) | Next goal: derivative Staff Artwork previews |
| Production signing IAM unproven | Med | Separate production IAM checkpoint |
| Accidental DEV customer registration via Google | High (ops) | Next goal: DEV overlay + approved-email gate |
| Portal build EPERM on Windows | Low | Known; typecheck + contracts cover SEO wiring |

---

## Deferred Items (Roadmap)
- `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening` (next managed goal)
- Production promotion of this goal’s Functions/Portal/Studio changes (separately gated)
- Production Internal History repair Apply (after Preview)
- Production Gen2 TokenCreator IAM if confirmed

---

## Open Blockers
- [x] None for Signoff of this DEV goal

---

## Verdict

**approved_with_notes** — Owner DEV QA PASS WITH NOTES; forward A and C accepted; B intentional Staff Artwork blank + production IAM deferred; historical production stale Queued Internal PRs and DEV access hardening deferred to the next managed goal.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (then new goal takes over)
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** New managed goal Plan → Formal Review (already starting per owner prompt).
