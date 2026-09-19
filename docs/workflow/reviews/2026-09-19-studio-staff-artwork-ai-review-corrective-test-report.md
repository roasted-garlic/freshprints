# Test Report: Studio Staff Artwork → AI Review corrective

| Field | Value |
|---|---|
| Date | 2026-09-19 |
| Plan | `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` |
| Review | `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-formal-review.md` |
| Amendment Review | `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-amendment-formal-review.md` |
| Result | **PASS — amendment automated Test complete; Owner DEV QA still required before Signoff** |

## Automated verification

- Focused title, canonical persistence, Staff Artwork promotion/action/pagination/preview, AI Review,
  approval, Design Library, Portal projection, permissions, storage-path, deletion-eligibility,
  sort persistence, Auto advance persistence, legacy fixtures, and reconciliation-guard suite:
  **119/119 passed**.
- Studio typecheck: `npx tsc --noEmit -p apps/studio/tsconfig.json` — **passed**.
- Functions build: `npm run build --prefix functions` — **passed**.
- Studio package build: `npm run build --workspace @fresh-prints/studio` — **passed**.
- Targeted lint over changed Functions, Studio, shared, and contract files with
  `--max-warnings 0` — **passed**.
- `git diff --check` — **passed**.

## Amendment verification

- Staff Artwork-originated queued AI enrichment now persists a structurally valid AI title to the
  canonical Design only when the root is import-derived/legacy-unknown. Explicit staff, trusted
  import, and already AI-owned titles remain protected; normal Imports, Ready Design reprocessing,
  and customer-upload roots do not enter this path.
- Real pre-corrective schema fixtures prove default/short-ID normalization, explicit-title
  protection, source filename retention, canonical imported/pending metadata, and post-corrective
  provenance behavior. Promotion also checks an existing Design by `sourceStaffArtworkId` before
  creating one, and missing legacy derivative fields fall back to the deterministic private paths
  while copying only existing optional derivatives.
- AI Review sort preference tests prove localStorage read/write, invalid-value rejection, both
  directions, and page integration without a Firestore/backend preference. The effective sort is
  carried through tab/filter state and is not reset by queue data or selection changes.
- AI Processing Auto advance tests prove the existing preference key now persists in localStorage,
  keeps the default ON behavior, migrates a valid legacy sessionStorage value only when no valid
  local value exists, rejects invalid values safely, and remains wired only to the shared Processing
  queue toggle. No queue data, filter, pagination, selection, processing action, or Auto process
  state writes this preference.
- Owner clarification canonical-title tests prove one `sourceStaffArtworkId`-scoped invariant across
  four histories: newly created Staff Artwork, pre-corrective Staff Artwork, already-waiting
  Processing artwork, and previously AI-processed/reprocessed artwork. Old generated placeholder
  roots with the incorrect prior `catalogTitleSource: "staff"` stamp are repaired only when the old
  shape has no `importSourceFileName`; human-looking explicit staff titles remain protected.
- The lifecycle fixture records the canonical title at every required boundary: pre-AI root,
  `aiSuggestions.title` after AI, `designs.title` after AI, AI Review draft, approval write,
  post-approval `designs.title` and `catalogTitleSource`, Design Library title, and Portal
  projection title. Portal is asserted to read persisted ready `data.title`, never
  `aiSuggestions.title`.
- `node --test functions/scripts/lib/staffArtworkPromotionReconciliationGuard.test.mjs` — **4/4
  passed**. The DEV-only command `functions/scripts/staff-artwork-promotion-reconciliation-dev.mjs`
  was run against `fresh-prints-dev` in `DRY_RUN_READ_ONLY` mode; it performed **zero writes**.

### DEV read-only inventory (clarification rerun)

- 23 Staff-Artwork-originated Design candidates were read: **22 repairable legacy placeholder
  candidates** and 1 unrecoverable derivative case. All 22 repairable candidates have the old
  `catalogTitleSource: "staff"` stamp, generated short titles, and no `importSourceFileName`.
- 7 ready Staff Artwork records still lack `catalogTitleSource`; these remain deterministic
  at-promotion cases and were not changed.
- The one unrecoverable case is Design `coiXzQDhJBKBVB1dFVZT`: it had its canonical thumbnail but
  no canonical preview, no surviving private Staff Artwork record, and no recoverable preview
  source; it already has an AI-owned title and was reported, not changed.

No DEV record, Design, or Storage object was mutated or deleted.

An adjacent existing `aiReviewFormState.test.ts` run exposed four unrelated tag-seeding expectation
failures for retired AI-tag behavior; the added title-only AI Review seed test passed. Those failures
are outside this corrective’s title/persistence scope and are not counted in the 119-test focused
result above.

The documented `npm --workspace @fresh-prints/functions run build` form is not applicable because
`functions/package.json` is not part of the root npm workspaces; the package-local build script was
run directly and passed.

## Coverage recorded

- Generated/default Staff Artwork titles are marked import-derived; explicit create/edit titles are
  staff authority; legacy records use the bounded existing placeholder detector.
- Promotion carries title provenance and source filename into the canonical Design, while keeping
  the existing imported/pending lifecycle and canonical preview/thumbnail copy.
- Staff Artwork action wording is `Send to AI`; the `AI Review` workspace remains unchanged.
- Cursor pagination uses deterministic newest-first ordering, `pageSize + 1`, timestamp/document-ID
  cursor advancement, bounded index failure behavior, reload/reset after removal, and preserved
  selection contracts.
- AI Review preview readers remain on canonical Design derivative paths with preview/thumbnail
  fallback behavior; no private Staff Artwork reader was introduced.
- Canonical title authority is origin-based (`sourceStaffArtworkId`), not creation or processing
  history. Approval marks the accepted reviewed title as staff authority while preserving the
  accepted AI/reviewed title value; Design Library and Portal consume that persisted canonical
  title.

## Remaining gate

Owner DEV QA must verify the Studio Staff Artwork flow in a development environment, including:

1. create one Staff Artwork without a title and one with an explicit title;
2. send new and pre-corrective legacy Staff Artwork with **Send to AI**, confirm imported/pending
   lifecycle, no duplicate Design, pagination, and Multiple Select behavior across pages;
3. verify one already-waiting and one previously AI-processed Staff-Artwork-originated Design;
4. for each history, record root `designs.title` before AI, `aiSuggestions.title` after AI,
   `designs.title` after AI, AI Review title, approval title submitted, post-approval
   `designs.title`/`catalogTitleSource`, Design Library title, and Portal catalog title;
5. select each AI Processing sort direction and the **Auto advance** direction, reload, paginate,
   navigate away/back, and restart Studio to confirm both persist until explicitly toggled;
6. confirm the Staff Artwork preview/thumbnail remains visible in AI Review; and
7. confirm normal Imports, Ready Design reprocess, customer uploads, unrelated filters, and
   selections remain unchanged.

No production deployment, Studio release, migration, backfill, index deployment, Rules change, or
console action was performed.
