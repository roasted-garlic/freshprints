# Signoff: Catalog Image Derivative Storage Consolidation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md` |
| Real inventory report | `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-real-dev-inventory-report.md` |
| Final status | **closed_by_owner_after_inventory** |

---

## Summary

Goal #12 investigated whether catalog design thumbnails and previews could be consolidated into
one shared display derivative to reduce Storage usage. Plan and Formal Review completed
(`approved_with_changes`). Two rounds of owner sample review evaluated candidate dimensions/
quality against real UI-rendering measurements and a synthetic contact sheet, converging on
1024×1024 WebP Q82 with no separate thumbnail. A dry-run-only, owner/admin-restricted Storage
inventory callable (`inventoryCatalogImageStorage`) was built, independently security-reviewed,
and deployed to `fresh-prints-dev`. The owner ran it against real catalog data.

**The real measurement showed originals account for ~97.66% of catalog Storage
(980,807,863 / 1,004,304,719 bytes); existing thumbnails + previews together use only
23,496,856 bytes.** Given that production originals must remain unchanged regardless of any
derivative consolidation, the owner made an evidence-based decision to stop the migration before
implementation: the addressable byte pool was too small relative to the implementation risk,
required backfill, consumer cutover, and grid-bandwidth increase (~86 KB vs ~23 KB per typical
8-card grid at 1024×1024) that completing the migration would have required.

**This is a successful, evidence-based decision, not a failed implementation.** The investigation,
measurement tooling, and owner-approval process worked exactly as the FreshForge workflow intends —
real data changed the cost/benefit calculus before any production-facing code was shipped, and the
goal was closed cleanly rather than carried to a conclusion the evidence no longer supported.

---

## What Was NOT Implemented

- No shared display derivative (1024×1024 WebP Q82 or any other dimension/quality) was ever
  generated for any real catalog design.
- No `displayPath` field was ever populated on any `designs` Firestore document.
- No consumer (Portal or Studio, grid or detail/lightbox) was migrated to prefer a display
  derivative — every consumer continues reading exactly `thumbnailPath`/`previewPath` as before
  this goal began.
- No backfill callable was built or executed.
- No `/display/{designId}.webp` Storage object was ever created.
- No Storage Rules change was deployed.
- No generated catalog-reference or Portal-catalog manifest was republished with derivative
  changes.
- No thumbnail or preview object was deleted, modified, or touched in any way.
- No production original was modified.
- No cleanup or deletion tooling was built — the real inventory found zero orphans, zero missing
  objects, zero promotion-cool-off duplicates, and zero purge-policy violations, so none was
  justified.
- Production (`fresh-prints-prod`) was never targeted by any command in this goal at any point.

---

## What Was Retained (Dev-Only Diagnostic Tooling)

The investigation and measurement infrastructure built during this goal remains genuinely useful
and was **not** reverted:

- `packages/shared/src/utils/catalogImageStorageInventory.ts` + `.test.ts` — pure, unit-tested
  Storage-object classification logic (referenced / orphaned candidate / purged-per-policy
  violation / promotion cool-off duplicate).
- `functions/src/inventoryCatalogImageStorage.ts` — the dry-run-only, owner/admin-restricted,
  read-only Cloud Function, already deployed to `fresh-prints-dev` and independently security-
  reviewed (confirmed: no delete/update/migration capability, no PII/artwork/URL exposure).
- `apps/studio/.../services/catalogImageStorageInventoryService.ts` and
  `.../components/CatalogImageStorageInventoryPanel.tsx` — the dev-only Studio "Run Catalog
  Storage Inventory" panel, gated behind the existing `fresh-prints-dev`-only + owner-only Test
  Data Reset page gates.
- All Goal #12 workflow artifacts (Plan, Formal Review, both owner sample-review checkpoints, the
  inventory deployment checkpoint, and the real inventory report) — retained as accurate historical
  record of a real, evidence-based investigation.

**These tools are diagnostic development tools only.** They must not be included in any production
deployment unless separately reviewed and explicitly approved in a future goal — this signoff does
not authorize that.

---

## Working-Tree Cleanup (this pass)

The prior implementation session was interrupted mid-Implement, having begun wiring `displayPath`
into shared types and generation constants but not yet reaching any consumer, generation, or
backfill code. Every file touched by that interrupted work was individually inspected against its
git baseline (or, for untracked pre-existing files, read directly) to distinguish Goal #12's
additions from unrelated pre-existing uncommitted work already present in the working tree before
this goal began. Removed:

- `getDisplayStoragePath()` helper and its dedicated test file (unused by anything except its own
  test; the deployed inventory callable only reads the `DESIGN_STORAGE_ROOTS.display` family name,
  never calls this function).
- `DISPLAY_CANDIDATE_DIMENSIONS_PX` / `DISPLAY_CANDIDATE_QUALITY` migration-only constants and
  their dedicated test file.
- The `displayPath?: string` field from Studio's `Design`/`CreateDesignInput`/`UpdateDesignInput`,
  Portal's `CatalogDesign`, and the generated `PortalCatalogCard` type — none were ever consumed
  by any component or manifest-publish code.
- The corresponding `displayPath` handling line in `mapPortalCatalogCard` and its dedicated test
  suite in `snapshotBuilders.test.ts`.

**Retained** `DESIGN_STORAGE_ROOTS.display` (the bare family-name string) in
`designStoragePaths.ts`, since the already-deployed `inventoryCatalogImageStorage` callable reads
it — removing it would desync the shared source from the live Cloud Function without a
corresponding redeploy, which this pass does not authorize.

No unrelated pre-existing change (found throughout the working tree, spanning many other
in-progress and already-signed-off goals) was reverted, reformatted, or touched.

---

## Remaining `displayPath` References — Explained

| Location | Status |
|---|---|
| `functions/src/inventoryCatalogImageStorage.ts:146` | Retained inventory-only compatibility — a purely defensive, read-only projection of a Firestore field that does not exist on any real document (matches `null` for every current design); part of the already-deployed callable's live contract |
| `packages/shared/src/utils/catalogImageStorageInventory.ts` / `.test.ts` | Retained inventory-only compatibility — the classification module's `displayPath` type field exists to describe the schema the (unused) `display` family would occupy if it ever existed; purely descriptive, never written |
| `apps/studio/.../originalPathProductionProtection.test.ts` | Generalized — the doc comment and regex no longer reference `displayPath` specifically; the test now guards against *any* derivative field substitution, a genuinely useful general-purpose regression guard independent of Goal #12's specific outcome |
| Every other location (Studio/Portal types, generated manifest types, snapshot builder) | Intentionally removed this pass — see "Working-Tree Cleanup" above |

No unexplained dead migration code remains.

---

## Verification

| Command | Exit code |
|---|---|
| `cd functions && npm run build` | 0 |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| `npm run build:studio` | 0 |
| `npm run lint` (repo-wide) | 0 |
| `npx eslint <14 retained/modified files> --report-unused-disable-directives --max-warnings 0` | 0 |
| `git diff --check -- <same files>` | 0 |
| `npx tsx --test packages/shared/src/utils/catalogImageStorageInventory.test.ts functions/src/catalogSnapshots/snapshotBuilders.test.ts apps/studio/.../originalPathProductionProtection.test.ts` | 0 (53/53 pass) |

---

## Confirmed Unchanged Behavior

- Original production PNGs remain the sole canonical asset for printing.
- Existing thumbnail generation (320×320 WebP Q80) is unchanged.
- Existing preview generation (1280×1280 WebP Q85) is unchanged.
- Portal continues reading `thumbnailPath`/`previewPath` exactly as before this goal.
- Studio continues reading `thumbnailPath`/`previewPath` exactly as before this goal.
- Show Queue ZIP export continues using `originalPath` exclusively (re-verified by the retained,
  generalized static-source regression test).
- Gang-sheet generation continues using `originalPath` exclusively (same test).
- Generated catalog-reference and Portal-catalog manifest assets retain their pre-Goal-#12 shape —
  `mapPortalCatalogCard` no longer emits a `displayPath` field.
- No design document requires, references, or is expected to eventually require `displayPath`.
- No migration or backfill is pending, scheduled, or partially executed.

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | Not in scope; never reached |
| Database migration | N/A | | None proposed; none executed |
| Design / UX (derivative dimensions/quality) | obtained then superseded | 2026-07-30 | Owner approved 1024×1024 Q82 round 2, then made the informed decision not to proceed to implementation after real inventory evidence — both are valid, sequential owner decisions |
| Business / policy (stop migration) | obtained | 2026-07-30 | Owner decision to close the goal, based on real measured Storage economics |
| Secrets / env | N/A | | None touched |
| Dev Functions deployment (`inventoryCatalogImageStorage`) | obtained and executed | 2026-07-30 | Deployed to `fresh-prints-dev` only; retained as dev-only diagnostic tooling |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| `inventoryCatalogImageStorage` remains deployed to `fresh-prints-dev` as a dev-only diagnostic tool | Low | Explicitly excluded from any future production deployment scope unless separately reviewed and approved; the production-release Plan must name it explicitly as excluded |
| The dev-only Studio "Run Catalog Storage Inventory" panel remains in the Test Data Reset page | Low | Same as above — inherits the page's existing dev+owner gating; production Studio builds must confirm this page/panel is excluded or gated off |
| `DESIGN_STORAGE_ROOTS.display` remains a defined (but unused) Storage path family constant | Low | Harmless — no code writes to it; retained only for source/deployed-function parity |

---

## Deferred Items (Roadmap)

- Goal #13: `production-release` — no longer blocked by Goal #12; started in this same pass (Plan
  phase).
- Future reconsideration of catalog derivative consolidation would require materially different
  catalog scale, bandwidth evidence, or Storage economics than what this goal measured
  (~87 designs, ~980.8 MB originals, ~22.4 MB combined thumbnails+previews) — not scheduled, not
  implied to be revisited automatically.

---

## Open Blockers

- [x] None. Goal #12 no longer blocks `production-release`.

---

## Verdict

**closed_by_owner_after_inventory.** The investigation was thorough, the measurement tooling was
built correctly and independently reviewed, and the owner's decision to stop before implementation
is a legitimate, evidence-based outcome of the FreshForge Plan → Review → Implement workflow
working as intended — not an incomplete or failed goal. All incomplete migration scaffolding has
been removed from the working tree; all genuinely useful diagnostic tooling has been retained,
correctly scoped as dev-only.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with closure status
- [x] `docs/project/ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — not needed (no new residual production risk; dev-only tooling risk
  captured above)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Proceed with the `production-release` Plan/Formal Review
prepared in this same pass, and provide the human decisions it flags as outstanding.
