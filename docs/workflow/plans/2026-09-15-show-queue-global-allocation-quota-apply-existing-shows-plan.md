# Plan: Show Queue global allocation quota — apply to existing shows

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `show-queue-global-allocation-quota-apply-existing-shows` |
| Parent program | Phase 7 / Show Queue operational-settings refinement |
| Related | Formal Review (pending) |

---

## Goal

When an owner/admin changes the Studio Show Queue **global default max quantity** (`settings/showQueue.defaultMaxTotalQuantity`), provide an explicit, default-unchecked checkbox **“Apply this quota to existing shows”** so that Save can optionally overwrite the same capacity value onto already-created **eligible** shows, instead of only changing the default for future creates.

Unchecked Save must preserve today’s behavior (global/default only). Checked Save must update the global default **and** eligible existing show documents truthfully, with UI feedback that reports the affected count and never claims full success after a partial show update.

---

## Background

Repo evidence (ROADMAP + code):

- Show Queue Settings cog already exposes **“Default max quantity for new shows”**.
- Comment and UI hint state the value is **applied only at show-creation time**; existing shows are never retroactively changed.
- This is **show capacity** (`maxTotalQuantity`), **not** Portal customer print limits (`settings/printRequestLimits` / ADR-FP-102 / ADR-FP-159).

Owner wants an explicit opt-in on Save to push the new global value onto already-created eligible shows.

---

## Investigation answers (required)

### 1. Where is the global allocation quota stored?

| Item | Evidence |
|------|----------|
| Document | `settings/showQueue` |
| Field | `defaultMaxTotalQuantity?: number` |
| UI | Show Queue Settings modal on `UpcomingShowsPage` — label **“Default max quantity for new shows”** |
| Hook | `useShowQueueSettings` → `updateSettings(...)` |
| Service | `showQueueSettingsService.updateSettings` — **direct client Firestore `setDoc(..., { merge: true })`** |
| Auth (UI + Rules) | `permissionService.canManageShowQueueSettings` → **owner/admin**; Rules `match /settings/showQueue` create/update: `isOwnerOrAdmin()` |

**Not this feature:** `settings/printRequestLimits` (customer per-request / per-customer-per-show limits). Do not couple.

### 2. Where is the per-show quota stored?

| Item | Evidence |
|------|----------|
| Collection | `upcomingShows/{upcomingShowId}` |
| Field | `maxTotalQuantity?: number` |
| Related flag | `maxQuantityOverridden: boolean` — **danger flag when staff lowers max below current `allocatedQuantity`**, not a “keep my custom default forever” override |
| Per-show edit path | `upcomingShowService.setShowMaxQuantity` (staff `canManageUpcomingShows`); blocked in UI for **Past** schedule shows |

### 3. Snapshot or live-derived?

**Creation-time snapshot.** Runtime allocation (Studio + Portal callables) reads **`upcomingShows.maxTotalQuantity`**, not live `settings/showQueue.defaultMaxTotalQuantity`. Changing the global default alone does not change existing shows.

### 4. Which creation paths populate it?

| Path | Source | Populates `maxTotalQuantity` from |
|------|--------|-----------------------------------|
| Manual / Whatnot **create** via `upcomingShowService.upsertUpcomingShow` | `whatnot` | `showQueueSettings.defaultMaxTotalQuantity` |
| Whatnot **update** of existing show | `whatnot` | **Does not** rewrite capacity |
| DEV fixture create (`upsertDevFixtureShow` callable) | `dev_fixture` | Reads `settings/showQueue.defaultMaxTotalQuantity` |
| Internal Gang Sheet create (`createStaffGangSheetLane` / `completeStaffGangSheetAndOpenNext`) | `staff_gang_sheet` | **`DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY` (200)** — **not** the Show Queue global default |

### 5. Which existing show lifecycle states should be bulk-updated?

Authoritative helpers already exist:

- Schedule: `getShowScheduleTab` / `isPastScheduledShow` / `canAllocatePrintRequestToShow` (`packages/shared/src/utils/showScheduleGrouping.ts`)
- Capacity edit UI: Past shows cannot open the max-quantity modal
- Terminal production: `completed`, `fully_printed`, `archived`, `canceled` (and recovery treats past unresolved Whatnot as Needs Attention)

**Bulk-update eligibility (Plan contract):**

**Include** a show when **all** are true:

1. Schedule tab is **Upcoming** (`getShowScheduleTab(show, now) === "upcoming"`) — excludes Past and Needs Attention (Needs Attention is past-schedule unresolved).
2. `productionStatus` ∈ `{ "open", "full", "printing" }` — still operational for capacity/allocation management. **Include `full`** so raising the global quota can reopen capacity on shows already at the old cap.
3. `source` ∈ `{ "whatnot", "dev_fixture" }` — only sources that snapshot `defaultMaxTotalQuantity` at create.
4. `isArchived !== true` (defensive; archived should already be terminal via production status).

**Exclude:**

| State | Why |
|-------|-----|
| Past schedule | Read-only for capacity edits today |
| Needs Attention | Past-schedule unresolved; same Past capacity gate |
| `productionStatus` `completed` / `fully_printed` / `archived` / `canceled` | Terminal / historical |
| `source === "staff_gang_sheet"` | Uses separate Internal Gang Sheet default (200), not global Show Queue default |
| Shows where new max is a finite number **and** `newMax < allocatedQuantity` | Same danger case as `setShowMaxQuantity` without override — **skip**, do not auto-set `maxQuantityOverridden` |

**Do not** use `canAcceptNewShowAllocations` alone as the eligibility filter — it excludes capacity-`full` shows, which must still receive a raised quota.

### 6. Are explicit per-show overrides distinct from creation-time snapshots?

**No separate “intentional override vs snapshot” model exists.**

- Staff may later change a show’s `maxTotalQuantity` via Settings/detail → max-quantity modal.
- There is **no** durable field meaning “preserve this show’s custom quota when global changes.”
- `maxQuantityOverridden` only records a danger confirm when max is set **below allocated quantity**.

Therefore, when the owner **checks** Apply, overwriting eligible shows’ current `maxTotalQuantity` with the newly saved global value is **intentional product behavior**. Formal Review must acknowledge this; no silent special-case preservation of differing values.

**Orthogonal and unchanged:** ADR-FP-159 `customers.{id}.printRequestQuotaOverride` and `settings/printRequestLimits`.

### 7. Which roles may perform this operation?

| Action | Role |
|--------|------|
| Edit Show Queue Settings (including global default) | **owner / admin** (`canManageShowQueueSettings`) |
| Bulk apply (must match) | **owner / admin only** — do not broaden |
| Per-show capacity edit (existing) | Any staff (`canManageUpcomingShows`) — unchanged; not the bulk path |

UI gating alone is insufficient; the bulk mutation path must enforce owner/admin in the trusted boundary (callable).

### 8. Safest atomic / batched update architecture?

**Recommended:**

| Path | Behavior |
|------|----------|
| Checkbox **unchecked** | Keep existing client `showQueueSettingsService.updateSettings` (Whatnot URL, cutoff, default max, etc.) — **no behavior change** |
| Checkbox **checked** | After validating inputs, call a **new trusted owner/admin callable** that: (1) writes `settings/showQueue.defaultMaxTotalQuantity` (and audit fields), (2) queries eligible shows, (3) chunked Admin `writeBatch` updates (`maxTotalQuantity`, `updatedBy`, `updatedAt`; clear via `FieldValue.delete()` when applying “no limit”), (4) returns `{ updatedShowCount, skippedBelowAllocatedCount }` |

**Other settings fields on the same Save** (Whatnot base URL, portal cutoff): continue through the existing client `updateSettings` in the same handler (unchanged authority). Only the **default max + optional apply** needs the callable when Apply is checked. When Apply is checked, still save non-quota settings via the existing client path so one Save remains one user action.

**Failure / truthfulness:**

- Do **not** report full success if any show chunk fails after partial updates.
- Preferred callable semantics: attempt all chunks; on first chunk failure, throw with counts of shows already updated in prior chunks (honest partial), **or** fail before any show write if settings write fails.
- Settings write + show updates cannot be one Firestore transaction at unbounded show count (500 op / batch limit). Document that settings may commit before show chunks; UI must surface partial failure clearly.
- Zero eligible shows → success with `updatedShowCount: 0` (not an error).
- Bulk logic lives in Functions + shared eligibility helper — **not** in the React modal.

**Rejected for v1:** Client-only Studio `writeBatch` loops for bulk apply (weaker auth story for multi-doc mutation, harder truthful multi-chunk failure reporting, diverges from “trusted boundary for bulk staff ops”).

### 9. Do Firestore Rules need to change?

**No**, under the recommended callable architecture:

- Settings continue to allow owner/admin writes (unchecked path / non-quota fields).
- Callable uses Admin SDK for show updates (Rules do not apply to Admin).
- No new client-writable fields; no schema migration.

If Formal Review instead forced a client-batch approach, Rules would still likely allow staff updates of `maxTotalQuantity` already — but that path is **not** recommended.

### 10. Exact files expected to change

**Studio UI / hook / service**

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — checkbox, save wiring, success copy, reset checkbox after success
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueueSettings.ts` — optional apply flag / callable result
- `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` — invoke callable when apply requested; comments
- CSS only if existing Show Queue settings form needs a checkbox row (prefer existing form/hint patterns)

**Shared**

- New helper e.g. `packages/shared/src/utils/showQueueDefaultMaxApplyEligibility.ts` (+ tests) — eligibility + skip-below-allocated predicate shared by Functions (and Studio contracts)

**Functions**

- New callable module e.g. `functions/src/applyShowQueueDefaultMaxToEligibleShows.ts` (+ unit/core tests)
- Export from `functions/src/index.ts`

**Docs (same workflow)**

- `docs/architecture/DATA_MODEL.md` — note optional apply-on-save behavior for `defaultMaxTotalQuantity`
- `docs/project/DECISIONS.md` — short ADR for opt-in apply-to-existing
- `docs/project/ROADMAP.md` — one-line update to the “applied only at creation” statement
- Possibly `docs/architecture/BACKEND.md` — callable inventory

**Explicitly not touched unless investigation during Implement proves otherwise:** Portal, print-request limit settings, customer quota override, Rules, indexes, Whatnot sync semantics beyond create-time default already documented.

### 11. Focused tests proving unchecked vs checked

| Case | Layer |
|------|-------|
| Unchecked save updates global only | Studio service/hook contract +/or callable not invoked |
| Checked save updates global + eligible shows | Functions core tests with fixtures |
| Terminal / Past / Needs Attention / Internal GS excluded | Shared eligibility + Functions |
| Zero eligible shows → success count 0 | Functions |
| Multiple eligible shows updated | Functions (multi-doc / chunk boundary if practical) |
| Authorization: non-owner/admin denied | Functions |
| Partial/batch failure does not claim full success | Functions + Studio error handling contract |
| Checkbox resets after successful save | Studio UI/state contract |
| Customer temporary override unchanged | Existing ADR-FP-159 focused suite regression (no edits expected) |
| New-show default still snapshots global | Existing create path regression / contract |
| Allocation enforcement uses updated show max | Reuse/extend capacity assessment or queue capacity fixture with updated `maxTotalQuantity` |

### 12. How customer-specific temporary overrides remain unchanged

ADR-FP-159 lives on `customers.{id}.printRequestQuotaOverride` and resolves against `settings/printRequestLimits`. This goal only mutates `settings/showQueue.defaultMaxTotalQuantity` and eligible `upcomingShows.maxTotalQuantity`. No shared code paths with customer override resolution will be edited. Regression: run existing quota-override focused tests unchanged.

---

## Scope

### In Scope

- Checkbox (default unchecked, ephemeral, reset after successful save)
- Unchecked Save = current behavior
- Checked Save = save global default + overwrite eligible existing show `maxTotalQuantity`
- Owner/admin-only trusted callable for apply path
- Shared eligibility helper
- Truthful success/failure + updated count
- Focused automated tests + Owner DEV QA
- Narrow docs/ADR updates

### Out of Scope

- New quota types; redesign of customer limits; ADR-FP-159 changes
- Bulk editing unrelated show settings
- Rewriting completed/Past/Needs Attention/Internal Gang Sheet historical capacity
- Show Queue redesign; new lifecycle statuses
- Production deploy / Portal publication / Studio release
- Unrelated migration/backfill outside this Save action
- Changing Portal one-working-request rules, cutoff, timer, Finish/DNP, gang sheets, Whatnot sync beyond existing create snapshot behavior

---

## Affected Areas

### Architecture Impact

- [x] Details: Add Functions callable for bulk apply; keep Settings client write for unchecked / non-quota fields. Shared eligibility helper. Layers: Modal → Hook → Service → Callable → Admin Firestore.

### Security Impact

- [x] Details: Preserve owner/admin for settings + bulk apply; server assert active owner/admin; no permission broadening; no Rules change expected.

### Data Model Impact

- [x] Details: No new persisted fields. Behavior change only: optional overwrite of existing `upcomingShows.maxTotalQuantity` when Apply is checked. Document in DATA_MODEL / ADR.

### Backend Impact

- [x] Details: New callable; Functions build + export. No env/secrets.

### UI / UX Impact

- [x] Details: Checkbox + helper near default max field; success copy when applied; Owner DEV QA required.

### Migration Impact

- [x] None (no backfill; opt-in Save only)

---

## Approach

1. Add shared eligibility helper with unit tests (Upcoming + open/full/printing + whatnot/dev_fixture; exclude Past/Needs Attention/terminal/Internal GS; skip below-allocated).
2. Implement Admin callable: auth → validate max → write settings default → query/filter → chunked batches → return counts.
3. Wire Studio Settings modal: ephemeral checkbox; on Save with Apply, call service/callable path; reset checkbox; success message with count; honest partial-failure messaging.
4. Keep unchecked path identical to today.
5. Update DATA_MODEL / DECISIONS / ROADMAP notes.
6. Focused Test gate → Owner DEV QA → Signoff. No production.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared eligibility unit | `npx tsx --test packages/shared/src/utils/showQueueDefaultMaxApplyEligibility.test.ts` (final name may match Implement) | yes |
| Functions callable/core | `npx tsx --test functions/src/applyShowQueueDefaultMaxToEligibleShows*.test.ts` | yes |
| Studio contracts (checkbox reset / unchecked path) | focused Studio upcoming-shows / settings tests | yes |
| ADR-FP-159 regression | existing customer quota override focused suite | yes |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit` | yes |
| Functions build | project Functions build script | yes |
| Targeted lint | eslint on touched files | yes |
| Diff hygiene | `git diff --check` | yes |
| Firestore Rules tests | only if Rules change (not expected) | conditional |

### Manual

- [x] Owner DEV QA on `fresh-prints-dev` after Implement/Test (checkbox off/on, eligible update, Past/terminal untouched, Internal GS untouched, auth, zero eligible, success copy, allocation reflects new max).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX / Owner DEV QA before Signoff
- [ ] Design approval (not required beyond matching existing Settings conventions)
- [x] Business logic: Formal Review acknowledges overwrite of manually edited show max when Apply is checked; excludes Internal Gang Sheets
- [ ] Production deploy — **forbidden** in this goal
- [ ] Database migration — none
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overwrite staff-tuned show capacity | medium | Explicit unchecked default; helper copy; Formal Review acceptance |
| Accidental Internal GS overwrite | medium | Exclude `staff_gang_sheet` by source |
| New max &lt; allocatedQuantity | medium | Skip those shows; return skip count; no auto-override |
| Partial batch failure reported as success | high | Callable + UI never claim full success on partial |
| Confusing with printRequestLimits / ADR-FP-159 | medium | Docs + regression tests; separate UI surface |
| Large show counts / 500 batch limit | low | Chunked Admin batches |

---

## Rollback Plan

- Revert Studio UI + callable export; redeploy prior Functions revision if DEV-deployed.
- No production change in this goal.
- Shows already overwritten in DEV can be corrected via existing per-show max modal or restoring prior values from backup/notes — no automated rollback.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — `settings/showQueue` / `upcomingShows.maxTotalQuantity` apply-on-save note
- [x] DECISIONS.md — ADR for opt-in apply
- [x] ROADMAP.md — adjust “applied only at creation” wording
- [ ] BACKEND.md — callable inventory if that doc lists Show Queue callables
- [ ] TESTING.md — only if new permanent test command patterns are introduced

---

## Open Questions

Resolved in Plan with recommended defaults (Formal Review may confirm):

1. **Internal Gang Sheets** — **exclude** from bulk apply (recommended).
2. **Below-allocated** — **skip + report**, do not auto-danger-override (recommended).
3. **Needs Attention / Past** — **exclude** (recommended; matches capacity edit gate).

No blocking human product choice remains if Formal Review accepts these defaults.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-formal-review.md`
- Verdict: pending
