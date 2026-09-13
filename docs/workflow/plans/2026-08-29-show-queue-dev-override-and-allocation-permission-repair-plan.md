# Plan: Show Queue DEV Override + Allocation Permission Repair

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `show-queue-dev-override-and-allocation-permission-repair` |
| Phase alignment | Phase 7 — Show Queue prerequisite (recovery testing enabler) |
| Related | ADR-FP-071, ADR-FP-149, Show Queue Phase 7 failsafe plan/signoff |
| Production | **NOT AUTHORIZED** |

---

## Goal

Restore authorized Studio staff ability to attach Print Requests to Show Queue shows (manual and Whatnot-backed), and add a **DEV-only** `DEV-OVERRIDE` Whatnot URL sentinel so realistic Show Queue lifecycle testing is possible on `fresh-prints-dev` without a real Whatnot URL.

This phase is a **prerequisite** for a later separate slice: Did Not Print bulk re-queue / Needs Re-queue triage. That recovery UX is **explicitly out of scope** here.

---

## Background

### Part A — Permission failure

Studio against `fresh-prints-dev` returns **Missing or insufficient permissions** when attaching a Print Request to a show (Show Queue → Add Request and Print Requests → Add to Show share `AddToShowModal` → `upcomingShowService.allocatePrintRequestItem`).

Investigation (repo-confirmed, 2026-08-29):

| Write step | Collection | Operation | Rules gate |
|------------|------------|-----------|------------|
| 1 | `showAllocations` | `setDoc` (create) | `isStaff()` + `showAllocationRequiredFieldsValid` on **new** doc |
| 2 | `upcomingShows` | `updateDoc` (`allocatedQuantity`, audit) | `staffCanUpdateUpcomingShow()` + **`upcomingShowRequiredFieldsValid` on full merged doc** |
| 3 | `printRequests` | `updateDoc` (`status: active` when draft/editing) | `isStaff()` + **`printRequestRequiredFieldsValid` on full merged doc** |

The three writes are **sequential, not transactional**. Step 1 can succeed while step 2 or 3 fails, surfacing a generic permission error and optionally leaving an orphan allocation.

**Root cause (primary — proven allowlist gap, not manual-show-specific):**

1. **`printRequests` rules allowlist is stale.** Persisted docs may include `customerUsernameAtCreationSnapshot` / `customerDisplayNameAtCreationSnapshot` (Portal username-change, 2026-08-27+) but `printRequestRequiredFieldsValid` in `firestore.rules` does **not** list them. Step 3 (`draft|editing → active` on allocate) validates the **merged** document and denies.

2. **`upcomingShows` rules allowlist is stale for recovery metadata.** Admin SDK show production recovery (2026-08-27+) writes `productionResolutionKind`, `productionResolvedAt`, `productionResolvedBy`, `productionOverrideReason` on completed shows. These fields are in TypeScript (`upcomingShow.types.ts`) but **absent** from `whatnotUpcomingShowFieldsValid` / `staffGangSheetUpcomingShowFieldsValid`. Step 2 denies when allocating to (or updating capacity on) such shows.

**Manual vs Whatnot-backed:** There is no separate manual allocation path. Manual Add Show uses `source: "whatnot"` + parsed UUID `whatnotShowId`. Same `allocatePrintRequestItem` path and rules. Manual shows fail when step 3 hits a print request with creation snapshots (common on customer requests).

**WS3 Rules deploy contribution (2026-08-29):**

- WS3 deploy included `firestore:rules` for merge job collections and customer identity fields.
- **`showAllocations` rules unchanged** since Show Queue foundation (git history).
- WS3 did **not** introduce the allocation failure; it did **not** fix pre-existing print-request / upcoming-show allowlist drift.
- **Conclusion:** Branch bug + latent rules drift, **not** a WS3 regression on allocation create rules. Deployed DEV rules may still lack **local uncommitted** allowlist fixes (e.g. `standardSizePresetKey` on items) — compare before deploy using `functions/scripts/compare-deployed-firestore-rules.mjs`.

---

## Scope

### In scope

**Part A — Permission repair**

- Reproduce failure in new emulator rules test mirroring `allocatePrintRequestItem` write sequence and document shapes.
- Narrow rules allowlist updates:
  - Add optional write-once creation snapshot fields to `printRequestRequiredFieldsValid`.
  - Add optional production resolution audit fields to Whatnot + staff gang sheet upcoming show validators.
- Optional: add `runTracedWrite` error context in Studio if step fails (no security broadening).
- Emulator/rules tests for authorized staff create/remove/counter update; customer denied; manual + Whatnot show fixtures.

**Part B — DEV-only `DEV-OVERRIDE`**

- Accept exact sentinel `DEV-OVERRIDE` (trimmed) in existing Whatnot URL field on **Add show** modal when gated to `fresh-prints-dev` dev build.
- Create shows usable on **Whatnot Show Queue** surface without real Whatnot identity.
- Show detail displays **`DEV OVERRIDE`** instead of external ID; no clickable Whatnot URL.
- Exclude DEV fixture shows from assisted Whatnot import matching.
- Automated tests for validation, gating, display, import safety.

### Out of scope

- Did Not Print bulk re-queue, Needs Re-queue triage, merge-on-release (future slice).
- WS4 User Info / customer activity.
- Production deploy / Studio publish.
- Whatnot sync architecture redesign.
- Converting DEV fixture show to real Whatnot URL (document as unsupported unless trivially safe).
- Firebase DEV deploy without owner checkpoint after implementation review.

---

## Affected files (expected)

### Part A

| Path | Change |
|------|--------|
| `firestore.rules` | Allowlist additions (printRequests, upcomingShows) |
| `tests/firebase/showQueueAllocation.rules.test.ts` | **New** — allocation attach sequence |
| `docs/architecture/DATA_MODEL.md` | Note rules allowlist parity for resolution + creation snapshots |
| `docs/standards/TESTING.md` | Document new rules test command |

### Part B

| Path | Change |
|------|--------|
| `packages/shared/src/types/upcomingShow/upcomingShow.enums.ts` | Add `dev_fixture` source |
| `packages/shared/src/types/upcomingShow/upcomingShow.types.ts` | Optional `devFixtureSentinel` |
| `packages/shared/src/utils/whatnotShowUrl.ts` | Export `DEV_OVERRIDE_SHOW_URL_SENTINEL` + `isDevOverrideShowUrlSentinel()` |
| `packages/shared/src/utils/whatnotShowUrl.test.ts` | Sentinel + gating tests |
| `packages/shared/src/utils/firebaseDevFixtureGate.ts` | **New** — reuse `fresh-prints-dev` allowlist pattern from `firebaseDebugPanelGate.ts` |
| `packages/shared/src/utils/whatnotShowImportPlan.ts` | Exclude `dev_fixture` from import matching |
| `firestore.rules` | `dev_fixture` validator (no `whatnotShowId`); **deny all client create/update** on `dev_fixture` (Admin SDK only) |
| `functions/src/upsertDevFixtureShow.ts` | **New** callable — project-gated create/update |
| `functions/src/index.ts` | Export callable |
| `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` | Sentinel branch → callable; detail display |
| `apps/studio/.../upcoming-shows/services/upcomingShowService.ts` | Map `dev_fixture`; list/filter on Whatnot surface |
| `apps/studio/.../upcoming-shows/utils/upcomingShowDisplay.ts` | DEV OVERRIDE labels |
| `apps/studio/.../utils/buildShowQueueDeepLinkPath.ts` | Route `dev_fixture` like Whatnot surface |
| `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` | ADR for DEV fixture shows |

---

## Part A — Approach

1. **Reproduce in emulator** with fixture print request carrying creation snapshots + fixture show (with and without production resolution fields). Confirm step 3 and/or step 2 denial against checked-in rules.

2. **Rules fix (narrow):**
   - `printRequestRequiredFieldsValid`: add optional strings `customerUsernameAtCreationSnapshot`, `customerDisplayNameAtCreationSnapshot` with existing `isOptionalString`.
   - `whatnotUpcomingShowFieldsValid` + `staffGangSheetUpcomingShowFieldsValid`: add optional `productionResolutionKind` (enum validation matching shared type), `productionResolvedAt`, `productionResolvedBy`, `productionOverrideReason`.

3. **Do not** broaden `isStaff()` or customer access to `showAllocations`.

4. **Verify** removal path still passes (`removeShowAllocation` → `recalculateShowAllocatedQuantity` uses same upcoming show update validator).

5. **Compare deployed DEV rules** before owner deploy (checkpoint artifact).

---

## Part B — DEV override design (binding)

### Sentinel input

- Exact token after trim: `DEV-OVERRIDE`
- Reject partial matches (`DEV`, `override`, `DEV-OVERRIDE-123`).

### DEV hard gate (client + server)

Reuse pattern:

```ts
isDevelopmentBuild && projectId === "fresh-prints-dev"
```

Shared helper: `packages/shared/src/utils/firebaseDevFixtureGate.ts` (parallel to `firebaseDebugPanelGate.ts`).

- Studio parser/validator rejects sentinel outside gate.
- Callable `upsertDevFixtureShow` rejects unless `GCLOUD_PROJECT === "fresh-prints-dev"`.

### Persistence model (no fake Whatnot ID)

| Field | Value |
|-------|--------|
| `source` | `"dev_fixture"` (new enum value) |
| `whatnotShowId` | **absent** (not empty string, not `DEV-OVERRIDE`) |
| `whatnotUrl` | **absent** |
| `devFixtureSentinel` | `"DEV-OVERRIDE"` (audit marker; optional in types) |
| Identity key | Firestore document ID; upsert by doc id on edit, not Whatnot import matching |

**Create path:** Studio modal → **`upsertDevFixtureShow` callable** (Admin SDK). Client Firestore rules **deny** client writes where `resource.data.source == "dev_fixture"` or `request.resource.data.source == "dev_fixture"`.

**Why callable:** Firestore rules cannot read GCP project ID; callable project gate is fail-closed for production.

### Show Queue surface

- Whatnot Show Queue list/filter includes `source === "whatnot" || source === "dev_fixture"`.
- Allocation uses same `allocatePrintRequestItem` (after Part A rules fix + `dev_fixture` upcoming show validator for capacity updates).

### Display

- Detail fact row **Whatnot show ID** → **`DEV OVERRIDE`**
- URL row → **`No external Whatnot URL`** (non-link)
- Title/capacity/schedule validation unchanged.

### Import / sync safety

- `planWhatnotShowImport` / `findMatchingUpcomingShow` ignore `dev_fixture`.
- No Whatnot URL open action for `dev_fixture`.
- Electron import scanner unchanged; DEV fixtures never match imported candidates.

---

## Permission policy preserved

| Action | Studio client | Rules |
|--------|---------------|-------|
| View Show Queue | `canViewUpcomingShows` (staff) | `isStaff` read |
| Create allocation | `canManageUpcomingShows` | `isStaff` + allocation field validator |
| Update show capacity | same | `staffCanUpdateUpcomingShow` + full-doc validator |
| Update PR status on queue | `canManagePrintRequests` | `isStaff` + transition guards |
| DEV fixture create | owner/admin/staff via callable auth | Admin SDK only |
| Portal queue | callables only | unchanged |

No customer/client write access to `showAllocations` or production fields.

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Whatnot URL / sentinel | `npx tsx --test packages/shared/src/utils/whatnotShowUrl.test.ts` | yes |
| DEV gate | `npx tsx --test packages/shared/src/utils/firebaseDevFixtureGate.test.ts` | yes |
| Import plan exclusion | `npx tsx --test packages/shared/src/utils/whatnotShowImportPlan.test.ts` (or new) | yes |
| Allocation rules | `npx tsx --test tests/firebase/showQueueAllocation.rules.test.ts` | yes |
| Functions build | `cd functions && npm run build` | yes (if callable added) |
| Studio scoped lint/tsc | targeted paths | yes |

### Manual (owner DEV QA)

See Formal Review checklist.

---

## Human checkpoints

- [ ] **Firebase DEV deploy** after implementation review (Rules + Functions if callable added) — owner explicit approval only.
- [ ] Manual Show Queue attach QA on `fresh-prints-dev`.
- [ ] Production remains **NOT AUTHORIZED**.

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Allowlist expansion too broad | medium | Only documented optional fields; emulator tests |
| Orphan allocation if step 1 succeeds | medium | Rules fix removes failure; follow-up slice could add transaction |
| DEV fixture callable on prod | high | `GCLOUD_PROJECT` gate + no prod deploy authorization |
| `dev_fixture` spoof on prod via Admin | low | No prod deploy; rules deny client writes |

---

## Rollback

- Revert rules deploy to prior release on DEV.
- Remove callable export; DEV fixture shows remain readable but no new creates.
- Part A allowlist additions are backward-compatible; rollback only if unintended exposure found.

---

## Documentation updates

- [x] `docs/architecture/DATA_MODEL.md` — `dev_fixture` source, resolution fields rules parity
- [x] `docs/project/DECISIONS.md` — ADR for DEV fixture shows
- [x] `docs/standards/TESTING.md` — rules test entry

---

## Firebase deploy checkpoint (anticipated)

After implementation review, expect owner-authorized DEV deploy:

```bash
firebase deploy --only firestore:rules,functions:upsertDevFixtureShow --project fresh-prints-dev
```

Exact scope confirmed in implementation review. **Do not deploy automatically.**

---

## Open questions

- [ ] None — owner binding decisions supplied in phase prompt.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-review.md`
- Verdict: pending → see review
