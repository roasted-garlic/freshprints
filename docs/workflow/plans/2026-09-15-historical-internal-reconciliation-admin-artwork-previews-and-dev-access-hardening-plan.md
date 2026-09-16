# Plan: Historical Internal reconciliation, Admin artwork previews, and DEV access hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal slug | `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening` |
| Related | Prior signoff `2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-signoff.md` |

---

## Goal

Deliver three bounded pre-production workstreams: (A) owner Preview→Apply repair for historical completed Internal Gang Sheets whose Internal PRs remain Queued; (B) Portal Admin View Designs previews for **all** artwork types including Staff Artwork derivatives (ADR-FP-187 preserved); (C) DEV-only login/register full-screen warning overlay plus server-authoritative approved-email customer access gate, with production registration/login completely unaffected.

No production mutation is authorized by this Plan’s Implement phase.

---

## Background

Prior goal closed **approved_with_notes** (Owner DEV QA PASS WITH NOTES):

- Forward Mark Complete → Printed works on DEV; production still has historical completed Internal History sheets with Queued Internal PRs.
- Admin View Designs honesty landed; Staff Artwork intentionally blank — owner now requires previews for all types.
- DEV banner/noindex works; a real customer found DEV via Google and registered → DEV auth friction + allowlist required.

---

## Scope

### In Scope
- A: Preview→Apply historical Internal reconciliation reusing finish/reconcile helpers
- B: Staff Artwork derivative signed previews in Admin View Designs; keep signing-error honesty
- C: DEV login/register overlay + session ack; DEV approved-email list (Studio owner/admin manage); server gate on `fresh-prints-dev`
- Compact Production Promotion Manifest entry at Signoff

### Out of Scope
- Generic Move-to-Printed; public Staff Artwork; originals; Storage Rules widen
- Production registration restrictions; secret-URL-only DEV protection
- Identity Platform Auth blocking Functions (document limitation; separate checkpoint if later desired)
- Production IAM mutation, production Apply, production deploy

---

## Investigation answers (1–31)

### A — Historical reconciliation

#### 1. Expected old production state pattern
Completed `upcomingShows` with `source === "staff_gang_sheet"` and `productionStatus === "completed"` (History), while related `showAllocations` remain finishable (`pending`|`queued`|`in_progress`), Internal PR `status` non-completed, `queueTab === "queued"`. Pre-WS2 Mark Complete closed the sheet without finishing allocations.

#### 2. Can completed staff_gang_sheet authorize finishing stale allocations?
**Yes for a dedicated remediation.** `finishShowAllocationsInTransaction` does not check show status—only allocation finishability. Existing Mark Complete idempotent retry can re-finish completed sheets but requires exactly one open successor (unsuitable for History-only repair). Whatnot `showProductionRecovery` **excludes** `staff_gang_sheet` and blocks already-terminal shows. New Preview→Apply must authorize completed Internal sheets **without** creating N+1.

#### 3. Repairable allocation statuses
`pending`, `queued`, `in_progress` → `done` (canonical `FINISHABLE_SHOW_ALLOCATION_STATUSES`).

#### 4. Records to skip
- Allocations `canceled`, `done`, `printed`
- Non–`staff_gang_sheet` shows; non-completed sheets (unless Formal Review later adds Current—default: completed only)
- Missing PR docs; PR already `completed`/`archived` (eligibility `already_terminal`)
- Allocations on other sheets (query scoped by `upcomingShowId`)

#### 5. Partial/multi-sheet safety
Reuse `reconcilePrintRequestsAfterShowFinish` → `evaluatePrintRequestCompletionEligibility` over **all** PR allocations. Sheet A finish alone cannot Print a PR with unfinished qty on Sheet B.

#### 6. Preview
Trusted owner callable (dry-run): scan selected completed sheet(s) or History with finishable allocs; return counts + optional IDs/names (sheets inspected, finishable allocs, affected PRs, would-become-Printed, remain-Queued, skipped/ambiguous). **No writes.** Mirror Show Production Recovery / Algolia dryRun Preview UX.

#### 7. Apply
After confirmation: re-read targets; assert `staff_gang_sheet` + `completed`; TX `finishShowAllocationsInTransaction` only; **no** new cycle; post-TX `reconcilePrintRequestsAfterShowFinish`; return truthful counts. Clear Studio Print Requests cache after success.

#### 8. Idempotency
Re-Apply skips non-finishable allocs; `already_terminal` PRs; `recomputeAndPersistQueueTab` no-ops when unchanged. Behavioral tests already lock this pattern.

#### 9. UI surface
Studio **Internal Sheets → History** on selected completed sheet: “Reconcile unfinished allocations…” Preview→Apply dialog. Optional owner Settings bulk scan later if needed—v1 = per-sheet from History. **Owner-only** (aligned with `force_completed` / queueTab backfill; not routine staff Mark Complete).

#### 10. Files (A)
| Area | Paths |
|---|---|
| Callables | `functions/src/previewInternalGangSheetHistoricalReconciliation.ts`, `applyInternalGangSheetHistoricalReconciliation.ts` (names TBD), `index.ts` |
| Reuse | `functions/src/lib/staffGangSheetShowFinishReconciliation.ts` (prefer no fork) |
| Shared types | `packages/shared/src/types/...` |
| Studio | `upcomingShowService` or dedicated service; `UpcomingShowsPage.tsx`; new dialog; `permissionService` owner gate |
| Tests/docs | behavior/contract tests; BACKEND.md; ADR |

---

### B — Admin artwork previews

#### 11. Staff Artwork derivative locations
Storage: `/staff-artwork/{id}/preview.webp`, `thumbnail.webp` (`staffArtworkStoragePaths.ts`). Firestore `staffArtworks/{id}`: `previewStoragePath`, `thumbnailStoragePath` (never expose `productionStoragePath` in admin DTO).

#### 12. Same Admin signing mechanism?
**Yes.** Resolve `staffArtworkId` from allocation → load `staffArtworks` → `signDerivativeUrl` (same as catalog/upload). Admin SDK bypasses Rules; keep 15-min TTL.

#### 13. Fallback ordering
`previewStoragePath` ?? `thumbnailStoragePath`. Never production/original. Missing → `missing_object`; signBlob fail → `signing_failed`.

#### 14. Production IAM evidence still required
Read-only: prod Gen2 runtime SA email; TokenCreator self-binding present?; logs/`SigningError` or successful signed URLs for catalog/upload. Staff Artwork code does not remove this need.

#### 15. Smallest IAM change if confirmed
`gcloud iam service-accounts add-iam-policy-binding` TokenCreator **self-binding** on confirmed prod Compute SA (`firebase-signed-url-iam.md`). No Rules change; IAM alone needs no redeploy.

#### 16. Production mutation checkpoint
Implement source on `development` only. Prod IAM/Function promotion = separate owner checkpoints. Record in Production Promotion Manifest at Signoff.

#### 17. Files (B)
`getPortalAdminShowQueueRequestDesigns.ts` (+ tests); types/modal labels; ADR-FP-187 note; BACKEND.md; IAM doc. Not: `storage.rules`, `staffArtwork.ts` finalize (derivatives already written).

---

### C — DEV access

#### 18. Auth flows today
Email login (`signInWithEmailAndPassword`); Google (`signInWithPopup`); email signup (`createUserWithEmailAndPassword` then `registerCustomer`); Google first-time → complete-profile → `registerCustomer`. Staff non-customer roles redirected away from customer Portal.

#### 19. Trusted boundary
**Cloud Functions** (esp. `registerCustomer`) + Rules. Overlay/UI is not security.

#### 20–21. Prevent raw Auth account creation?
**Not with current stack** — no Identity Platform `beforeUserCreated` in repo. Enabling GCIP blocking = separate human checkpoint. Plan accepts orphan Auth users; denies application provisioning/use.

#### 22. Server-authoritative denial without Auth blocking
DEV-only (`GCLOUD_PROJECT === fresh-prints-dev`): reject `registerCustomer` if email not approved; deny/sign-out unapproved customer bootstrap for existing accidental accounts; customer mutators fail-closed if needed. Staff roles bypass customer allowlist.

#### 23. Allowlist storage
New DEV settings doc e.g. `settings/portalDevCustomerAccess` (email list), parallel to `portalMaintenance`—**not** overloaded onto maintenance. Exists meaningfully only on DEV project.

#### 24. Managers
Active **owner** and **admin** (Studio Settings beside Portal maintenance). Helpers excluded.

#### 25. Existing accidental DEV accounts
Unapproved customers cannot continue normal Portal use (clear restricted message + production link). No auto-delete Auth/customer on login. Disable/delete remains separate Studio identity ops.

#### 26. Staff vs allowlist
Owner/admin/helper: existing staff architecture. Customer allowlist applies to customer access only. No hard-coded owner emails in source.

#### 27. Overlay acknowledgement
**Owner correction (2026-09-15):** Overlay must appear on **every** visit to `/login` or `/register`. Acknowledgement dismisses only the current visit (component state). Not sessionStorage / localStorage durable. Persistent DEV banner remains after dismiss.

#### 27b. DEV Portal hosting
**Owner correction (2026-09-15):** DEV Portal runs at `http://localhost:3100`; `myprintrequest.dev` is the tunnel/domain to that local process. **Do not** treat `.dev` as a separately deployed App Hosting environment. App Hosting publication is a production (`myprintrequest.com`) concern.

#### 28. Environment detection
Access gate: **`fresh-prints-dev` project id** (Functions + Portal). Overlay display: same project gate (and may align with banner helper). Do not use `NODE_ENV` alone. Do not gate production if hostname wrong.

#### 29. Production unaffected proof
Unit/contract: prod project short-circuit no-ops allowlist; overlay absent; registration open. Manual prod read-only check at DEV QA.

#### 30. Files (C)
Portal login/register pages + overlay component + CSS; AuthProvider/register messaging; `functions/src/registerCustomer.ts` + `lib/portalDevCustomerAccess.ts`; get/update settings callables; Studio Settings section; shared constants; Rules for settings doc; tests for both env branches.

#### 31. Production Promotion Manifest (compact entry for Signoff)
| Kind | Entry |
|---|---|
| Code/deploy | Functions: historical recon Preview/Apply; `getPortalAdminShowQueueRequestDesigns` (Staff Artwork); DEV access callables + `registerCustomer` (prod no-op). **DEV Portal QA:** localhost (`:3100`) + `myprintrequest.dev` tunnel — **no** DEV App Hosting publish. **Production promotion (later, separately gated):** Portal App Hosting publication to `myprintrequest.com` if Portal source must ship. Studio release for History reconcile UI + DEV email settings. |
| External/config | Prod Gen2 TokenCreator self-binding **if** read-only confirms missing (B). Auth blocking Functions: **not** required for this goal. |
| One-time data | Prod Internal History reconciliation Preview → owner authorize → Apply. |
| Minimal smoke | One repaired historical Internal PR Printed; Admin View Designs catalog/upload/Staff Artwork; production login/register open; no DEV overlay/gate on prod. |

---

## Approach (after owner Implement approval)

1. A: shared preview classification + callables + History dialog; fixtures/tests first.
2. B: Staff Artwork resolve+sign; update tests/labels; no IAM mutation.
3. C: settings + callables + Studio manage UI; overlay; registerCustomer/bootstrap gate; prod short-circuit tests.
4. Test → Owner DEV QA → Signoff + Manifest append.
5. Production steps remain separately gated.

---

## Architecture / Security / Data / Backend / UI

- Architecture: Component→Hook→Service→callable; reuse finish/reconcile; ADR-FP-187.
- Security: owner-only A; owner/admin B & C settings; no Rules weaken; no email enumeration (generic restricted copy).
- Data: optional `settings/portalDevCustomerAccess`; no new PR statuses.
- Backend: new callables; registerCustomer DEV assert; Gen2 signing unchanged except Staff Artwork path.
- UI: History reconcile dialog; View Designs Staff Artwork thumbs; DEV auth overlay.
- Migration: none for A/B; C settings doc created on first Add on DEV.

---

## Test Strategy

| Area | Focus |
|---|---|
| A | Preview no writes; finishable/canceled/done; partial multi-sheet; Printed; isolation; idempotent Apply; unauthorized |
| B | catalog/upload/Staff Artwork; missing; signing_failed; authz; no originals |
| C | overlay DEV/prod; session ack; approved/unapproved; normalization; staff usable; registerCustomer gate; prod open |
| Builds | Functions build; Portal/Studio typecheck; Portal build if possible; `git diff --check`; Rules tests if Rules change |

---

## Human Checkpoints Anticipated
1. Owner Implement approval (this Formal Review)
2. Owner DEV QA before Signoff
3. Production IAM (B) separately
4. Production Auth blocking separately **if** ever pursued (not this goal)
5. Production History Preview separately
6. Production History Apply after Preview
7. Production Functions/Portal/Studio promotion separately

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Apply finishes wrong sheet | High | Re-read completed+source; Preview counts; owner-only |
| Orphan Auth users on DEV | Med | Documented; deny app access; optional later GCIP |
| Email enumeration | Med | Generic copy; no “email not on list” specifics |
| Prod gate leak | Critical | Project-id short-circuit + tests |
| Staff Artwork missing derivatives | Low | Truthful unavailable |

---

## Rollback
Revert `development` commits. Prod never mutated in this phase. Settings doc on DEV only.

---

## Documentation Updates Required
- BACKEND.md, DATA_MODEL.md (settings), DECISIONS.md (ADRs), DEPLOYMENT.md (DEV access), SECURITY.md if needed
- Production Promotion Manifest in handoff/CURRENT-STATE at Signoff
- TESTING.md if new commands

---

## Open Questions (for Formal Review)
1. A Apply: owner-only confirmed? (Plan recommends yes)
2. A v1: single selected History sheet vs bulk scan first? (Plan recommends selected sheet + optional bulk later)
3. C: deny existing unapproved at bootstrap (sign-out) in v1? (Plan recommends yes)
4. C: owner/admin manage allowlist (not owner-only)? (Plan recommends owner/admin)

---

## Approval
- Review doc: pending
- Verdict: pending
- Implementation blocked until owner explicit approval
