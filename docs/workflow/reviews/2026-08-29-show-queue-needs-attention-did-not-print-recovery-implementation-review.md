# Implementation Review — Show Queue Needs Attention Did Not Print Re-queue Recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `show-queue-needs-attention-did-not-print-recovery` |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-needs-attention-did-not-print-recovery-plan.md` |
| Formal review | `docs/workflow/reviews/2026-08-29-show-queue-needs-attention-did-not-print-recovery-review.md` |
| Verdict | **approved_for_dev_deploy_checkpoint** (Apply corrective deployed; owner re-QA in progress) |
| DEV deploy | **Apply corrective redeploy complete** (2026-08-29) — owner re-QA in progress |

---

## QA corrective — split-allocation preview warning (2026-08-29)

### Owner QA scenario

During DEV QA on Did Not Print → Move unprinted requests to another show:

- **Print Request:** CR005
- **Quantity:** 5 finishable on missed Source show only
- **No** pre-existing active allocation on another show

**Observed:** Preview showed split-allocation warning: *"Some requests also have allocations on other shows — only this show will be changed."*

**Expected:** No warning for single-show requeue.

### Root cause

Preview simulation in `predictRequestEffect` (`functions/src/lib/showProductionRecovery.ts`):

1. Canceled Source finishable allocations in simulated state
2. Appended **planned Destination replacement** rows to `simulatedWithTarget`
3. Evaluated "other show" allocations against `simulatedWithTarget`
4. Counted planned Destination rows as pre-existing other-show work → false positive

Legitimate split case (e.g. 4 on Source + 6 on another show) should still warn.

### Exact fix

| Change | Location |
|--------|----------|
| Other-show warning for requeue uses `simulatedAllocations` (pre-destination), not `simulatedWithTarget` | `predictRequestEffect` |
| Requeue preview `otherShowAllocationWarning` derived from `requeueLines.otherShowAllocationQuantity` | `buildShowProductionRecoveryPreview` |
| Split detection loads **all persisted allocations per Print Request** via `loadAllocationSnapshotsForRequeueLines` | `buildRequeuePreviewSection` |

**Unchanged:** authoritative requeue quantities, Apply semantics, destination allocation creation, Needs Re-queue behavior.

### Regression tests added

`packages/shared/src/utils/showProductionRecoveryRequeue.test.ts` — describe **requeue split-allocation warning (preview)**:

1. Single-show (5 on Source only) → warning absent
2. Real split (4 Source + 6 other) → warning present; requeue qty 4
3. Canceled on other show → no warning
4. Printed on other show → counts toward warning (existing domain semantics)
5. Planned destination rows in detection input would false-positive (documents why server loads DB only)
6. `totalRequeueQuantity` unchanged for single-show client preview

`functions/src/lib/showProductionRecoveryRequeue.test.ts` — contract asserts simulation fix + `loadAllocationSnapshotsForRequeueLines`.

**Focused test run:** **67 pass / 0 fail** (requeue/recovery suite). **Functions build:** pass. **Firestore Rules:** unchanged (no redeploy).

### Corrective DEV deploy evidence (2026-08-29)

**Pre-deploy:** branch `development`; Functions build pass; focused recovery tests **67/67**; no Rules changes.

**Command:**

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery --project fresh-prints-dev
```

**Exit code:** 0

| Resource | Result |
|----------|--------|
| `previewShowProductionRecovery` | Successful update (us-central1, v2 callable) |
| `applyShowProductionRecovery` | Successful update (us-central1, v2 callable) |

**Not deployed:** Firestore Rules, indexes, Storage Rules, unrelated Functions, production.

**Owner re-QA:** Reopen CR005 single-show Preview — split warning must be absent; then continue full QA including Apply.

---

## QA corrective — Apply Firestore undefined + success banner (2026-08-29)

### Owner QA scenario

During DEV QA on Did Not Print → Move → **Confirm Did Not Print + Move**:

- **Print Request:** CR005 (5 finishable on missed Source show)
- Preview succeeded; split warning absent after prior corrective

**Observed:** Apply failed with Firestore error:

> Cannot use "undefined" as a Firestore value (found in field "needsStaffRequeueAt")

**Expected:** Apply succeeds; modal closes; concise success banner summarizes the move.

### Root cause

Requeue Apply spread `clearNeedsStaffRequeuePatch()` into Admin SDK `transaction.update()`. That shared/client helper clears optional fields with `undefined` (valid for client writes with omit semantics). Admin SDK does **not** treat `undefined` as field deletion — it rejects the write.

Same pattern existed in release reconciliation when clearing markers (`reconcileRequestAfterRelease`).

### Exact fix

| Change | Location |
|--------|----------|
| Admin-safe marker clearing via `FieldValue.delete()` | `functions/src/lib/printRequestStaffRequeueAdmin.ts` (new) |
| Requeue Apply uses Admin helper | `showProductionRecoveryRequeue.ts` |
| Release reconcile clear path uses Admin helper | `showProductionRecovery.ts` |
| Success banner message after successful Apply | `DidNotPrintRecoveryDialog.tsx` + `formatRequeueUnfulfilledSuccessMessage` in shared utils |

**Unchanged:** client `clearNeedsStaffRequeuePatch()` (Studio allocation/transfer paths); preview checksum semantics; split-warning corrective.

### Regression tests

| Suite | Coverage |
|-------|----------|
| `functions/src/lib/printRequestStaffRequeueAdmin.test.ts` | Admin patch has no `undefined`; all four marker fields present |
| `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts` | `formatRequeueUnfulfilledSuccessMessage` |
| Existing requeue/recovery/contract suites | Apply planner, checksum, release ADR-FP-071, client marker clearing |

**Focused test run:** **73 pass / 0 fail**. **Functions build:** pass (local + deploy predeploy). **Firestore Rules:** unchanged by this corrective (**not redeployed**). **Indexes:** none required.

### Corrective DEV deploy evidence (2026-08-29 — Apply fix)

**Pre-deploy:** branch `development`; Functions build pass; focused recovery tests **73/73**; Rules/indexes not in deploy scope.

**Command:**

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery --project fresh-prints-dev
```

**Exit code:** 0

| Resource | Result |
|----------|--------|
| `previewShowProductionRecovery` | Successful update (us-central1, v2 callable, Node.js 20) |
| `applyShowProductionRecovery` | Successful update (us-central1, v2 callable, Node.js 20) |

**Not deployed:** Firestore Rules, indexes, Storage Rules, unrelated Functions, hosting, Portal, production.

**Post-deploy `firebase functions:list`:** both callables present and ACTIVE in `fresh-prints-dev`.

**Owner re-QA:** CR005 Apply requeue end-to-end, then Release-only → Needs Re-queue → Add to Show.

---

## QA enabler — Owner Edit show + Needs Re-queue tab (2026-08-29)

Scoped to current recovery DEV QA (not a separate managed goal).

| Change | Purpose |
|--------|---------|
| Owner-only **Edit show** (Studio + service + rules) | Adjust DEV fixture schedule/title/notes without delete/recreate |
| **Needs Re-queue** tab moved rightmost | Working triage UX during Release-only QA |

**Rules deploy:** see `.cursor/workflow/deploy-artifacts/2026-08-29-firestore-rules-reconciliation.md`

**Focused tests:** permission + metadata contract + `showQueueAllocation.rules.test.ts` **18/18** on deploy rules file.

---

## DEV deploy evidence (2026-08-29) — initial

**Pre-deploy verification**

| Check | Result |
|-------|--------|
| Branch | `development` |
| Functions build | pass |
| Recovery unit/contract tests | **84 pass / 0 fail** |
| Firestore rules | **150 pass / 0 fail** |
| Indexes required | **no** |
| Target project | `fresh-prints-dev` only |
| Production targeted | **no** |

**Command:**

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery,firestore:rules --project fresh-prints-dev
```

**Exit code:** 0

| Resource | Deploy result |
|----------|---------------|
| `firestore.rules` | released to cloud.firestore |
| `previewShowProductionRecovery` | Successful update (Node.js 20, us-central1, v2 callable) |
| `applyShowProductionRecovery` | Successful update (Node.js 20, us-central1, v2 callable) |

**Post-deploy `firebase functions:list`:** both recovery callables present as v2 callables in us-central1.

**Not deployed:** indexes, storage rules, unrelated Functions, hosting, production.

**Post-deploy smoke (agent):**

- Local Studio `.env.local` → `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`
- `npm run dev:studio` running; HMR on recovery components without compile errors
- Contract tests confirm Did Not Print recovery UI wiring

**Owner DEV QA:** pending — manual scenarios A–M.

---

## Implementation summary

Delivered Did Not Print recovery with:

1. **Primary:** `requeue_unfulfilled` — bulk move finishable source allocations to one eligible target show (server-authoritative).
2. **Secondary:** Enhanced `release_unfulfilled` — sets `needsStaffRequeue*` metadata; ADR-FP-071 preserved.
3. **Working triage:** `needs_requeue` filter + **NEEDS RE-QUEUE** badge.
4. **Lineage:** `requeuedFromAllocationId` on destination allocations (owner-approved V1).

---

## Implementation review checklist (26 items)

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Authoritative quantity server-derived | **Pass** — `collectRequeueEligibleAllocations` |
| 2 | Client cannot inject quantities | **Pass** — checksum + server recompute on apply |
| 3 | Source allocations historical | **Pass** — cancel only; no showId rewrite |
| 4 | Replacement lineage | **Pass** — `requeuedFromAllocationId` |
| 5 | Target allocations correct | **Pass** — clone from canceled rows |
| 6 | Mixed fulfillment no duplication | **Pass** — printed/done excluded |
| 7 | Transaction all-or-nothing | **Pass** — single Firestore transaction |
| 8 | Threshold enforced | **Pass** — 150 finishable max; `too_many_allocations` |
| 9 | Capacity revalidated | **Pass** — preview + apply |
| 10 | Target eligibility revalidated | **Pass** — shared helpers |
| 11 | Checksum detects stale preview | **Pass** — `preview_stale` on mismatch |
| 12 | Repeat apply no duplicates | **Pass** — `showProductionRecoveryApplications/{checksum}` |
| 13 | Source Did Not Print truthful | **Pass** — `unfulfilled_requeue` |
| 14 | Requeue keeps requests Queued | **Pass** — no active→editing on requeue |
| 15 | Release preserves ADR-FP-071 | **Pass** |
| 16 | Portal one continuable request | **Pass** |
| 17 | Needs Re-queue persistence | **Pass** — explicit fields |
| 18 | Needs Re-queue clearing | **Pass** — allocate/transfer clears |
| 19 | Add to Show clears marker | **Pass** — `clearNeedsStaffRequeueMarker` |
| 20 | Internal requests | **Pass** |
| 21 | CR→IR | **Pass** — blocked in preview |
| 22 | Rules narrowly updated | **Pass** |
| 23 | DEV fixtures excluded from Whatnot sync | **Pass** — unchanged |
| 24 | Existing recovery actions | **Pass** — regression tests |
| 25 | WS4 untouched | **Pass** |
| 26 | Production untouched | **Pass** |

---

## Automated test evidence

| Suite | Command | Result |
|-------|---------|--------|
| Shared + Functions + Studio contract | `npx tsx --test` (requeue + admin helper + contract files) | **73 pass / 0 fail** (post-Apply corrective) |
| Firestore rules | `npm run test:rules` | **pass** (unchanged; not redeployed for corrective) |
| Functions build | `npm run build` (functions/) | **pass** |

---

## Firebase DEV deploy required

**Yes** — recovery callables bundle new logic; rules include new optional fields.

**Exact scope:**

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery,firestore:rules --project fresh-prints-dev
```

**Not required:** indexes, storage, unrelated Functions, production.

---

## Verdict

**approved_for_dev_deploy_checkpoint** — initial DEV deploy + split-warning corrective + **Apply/success corrective** deployed. **Awaiting owner re-QA** (CR005 Apply + Release-only) before signoff.
