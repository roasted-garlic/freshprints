# Review: Increase the MB Limit for Custom-Request (Assisted Creation) Reference Images

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly re-verifies every fact carried over from Goal #9's Workstream B (all matched
current source with no drift) and substantially deepens the investigation — finding a fourth
enforcement location for the 15 MB constant, confirming reference images have no thumbnail
derivative (full-file fetch on every preview), and — most importantly — locating and correctly
analyzing the prior "proof preview hang" bug record to show it is a network/CORS-timing bug, not a
file-size bug, with a live 25 MB precedent (`ASSISTED_CREATION_MAX_PROOF_BYTES`) already running
through the identical download architecture. The three presented options are genuinely
evidence-graded (Option 2 backed by an observed production precedent, Option 3 explicitly flagged as
projected rather than observed) rather than arbitrary round numbers. The Plan correctly declines to
select a value and states the required owner checkpoint plainly. Approval is conditional on two
required changes below, both closing real gaps rather than expanding scope.

---

## Independent Verification

Re-verified directly against source:

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts:11-12` — confirmed
  `ASSISTED_CREATION_MAX_REFERENCE_IMAGES = 8`, `ASSISTED_CREATION_MAX_REFERENCE_BYTES = 15 * 1024 *
  1024`. Confirmed `ASSISTED_CREATION_MAX_PROOF_BYTES = 25 * 1024 * 1024` at line 22 — this is a real,
  currently-live constant, not a Plan invention.
- `storage.rules:150-158` — confirmed `isValidAssistedCreationImage()` (15 MB, 3 image types,
  hardcoded literal) and `isValidAssistedCreationProof()` (25 MB, same types) are separate functions
  with independently hardcoded literals — the Plan's claim that Storage Rules cannot import the TS
  constant is architecturally correct (Firestore/Storage Rules language has no module system).
- `storage.rules:168-171` — confirmed the durable `references/` path is `allow create, update,
  delete: if false` for all clients — the Plan's claim that only server-side copy can ever write
  there is accurate.
- `functions/src/assistedCreationRequests.ts` — confirmed via direct grep that all 10 exported
  `onCall(` calls have no options object (bare `async (request) =>` immediately follows each), and no
  `setGlobalOptions` exists anywhere in `functions/src/*.ts`. The Plan's conclusion that Function
  memory/timeout is irrelevant to this change (because bytes never transit a callable body) is
  independently confirmed via `assistedCreationService.ts:365` (`uploadBytes` direct-to-Storage) and
  `assistedCreationReferencePromote.ts` (server-side GCS-to-GCS copy, never touches callable memory).
- `docs/project/DECISIONS.md:525-550` — confirmed the exact ADR text the Plan quotes about the
  preview-hang bug. Confirmed the bug was attributed to `getBytes()` hanging under
  "Electron/Studio and sometimes Portal" network/CORS conditions, and confirmed the fix (12s timeout,
  `getDownloadURL`-first, settle-to-"Preview unavailable") is architecturally independent of file
  size — the Plan's risk analysis correctly distinguishes "reintroducing the hang" (not possible,
  since the fix is time-bounded, not size-bounded) from "increasing the fallback-timeout frequency"
  (a real, smaller, correctly-scoped risk).
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts:58,365,487-538` —
  confirmed `STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000`, confirmed single-shot `uploadBytes` (not
  resumable), confirmed the `getDownloadURL`-first/`getBytes`-fallback pattern.
- `packages/shared/src/utils/assistedCreationValidation.ts:462-470,525-533` — confirmed
  `sizeBytes` is client-reported metadata checked only for type/range, never cross-verified against
  the real Storage object via `getMetadata()`. Confirmed the Plan's nuanced conclusion that this is
  *not* a security gap (Storage Rules is the real, unspoofable gate) is correct — a customer cannot
  cause an oversized object to exist in Storage regardless of what `sizeBytes` they later claim.
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts:44-52` — confirmed
  `AssistedCreationReferenceImage` has exactly one `storagePath` field, no
  thumbnail/preview/derivative field — the Plan's "full file fetched even for a thumbnail" finding is
  accurate.
- `packages/shared/src/utils/assistedCreationValidation.test.ts` — confirmed this file exists (the
  Plan flagged its exact contents as `[NEEDS REPO CHECK during Implement]`); spot-checked and
  confirmed no existing test exercises the real 15 MB boundary (`sizeBytes` fixtures in the current
  test are trivial, e.g. `1024` bytes) — supporting the Plan's claim that new boundary tests are
  needed, not merely nice-to-have.
- `apps/portal/features/assisted-creation/components/AssistedCreationMediaThumbs.tsx:60` and
  `AssistedCreationDetailPanels.tsx:527,898,1106` — confirmed both files call
  `assistedCreationService.getPreviewObjectUrl(...)`, validating the Plan's consumer-inventory claim.

No citation in the Plan was found inaccurate or invented.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | No value is chosen; the boundary against Goal #9's customer-upload feature is explicit and file-list-backed |
| Architecture alignment | pass | Component → Hook → Service → Firebase boundary preserved; single shared-constant source of truth maintained |
| Security impact addressed | pass with condition | Ownership/Rules model correctly preserved; one required change below strengthens the manual-sync risk closure |
| Data model impact addressed | pass | No type change required unless a total-request ceiling is added, and that reuses the existing `sizeBytes` field |
| Backend impact addressed | pass | Correctly and non-obviously concludes Function config is irrelevant, with evidence |
| Test strategy adequate | pass with condition | Good required-coverage list; needs the Storage-Rules-vs-constant sync test to be explicitly non-optional, not just "recommended" |
| Human checkpoints identified | pass | Owner MB-value decision and separate Rules-deployment checkpoint both correctly flagged |
| Roadmap alignment | pass | Matches the owner-directed Goal #9→#10→#11→#12 sequence |
| Documentation plan | pass | ADR correctly deferred to Implement, not written now |
| No silent scope expansion | pass | 8-file count limit, dimension validation, extension validation, and cleanup gaps are all explicitly flagged as *not* in scope rather than silently bundled in |

---

## Architecture Review

**Findings:**
- The Plan's file inventory is accurate and the "Files Expected to Change During Implement" list is
  appropriately narrow — five files plus a to-be-located test file, all within the Assisted Creation
  feature boundary.
- Correctly identifies that no shared Storage-path-builder utility exists for this feature (unlike
  customer-uploads' dedicated `customerUploadStoragePaths.ts`) — this is accurate background, not a
  defect the Plan is trying to fix, and the Plan correctly does not propose introducing one as part
  of a pure limit change (that would be scope creep).

**Required changes:**
- [x] None.

---

## Security Review

**Findings:**
- The trust-model explanation (client `sizeBytes` is advisory, Storage Rules is authoritative) is
  correct and well-reasoned — this review independently re-derived the same conclusion from source
  before reading the Plan's own explanation, and they match.
- The Plan is correct that raising the limit does not, by itself, change any authentication,
  ownership, or Rules-boundary logic.
- The Plan appropriately separates "residual risks that exist today regardless of this change"
  (no dimension check, no extension check, animated WebP unblocked, no cleanup) from "risks this
  specific change introduces" — and correctly does not fold fixing the former into this goal's scope.

**Required changes:**
- [x] **Required change 1 (binding):** The Plan's Test Strategy currently frames the
  "Storage-Rules-literal-matches-shared-constant" automated test as part of a longer sentence
  describing "required test coverage," which could be read as merely encouraged. Given this manual-
  sync risk has now been independently surfaced **twice** across two consecutive goals (Goal #9's
  customer-upload feature and this goal's reference-image feature) without either goal actually
  closing it, Implement must treat this test as a **mandatory acceptance-criterion item**, not an
  optional nice-to-have — add it explicitly to the Plan's Acceptance Criteria checklist (currently
  absent as its own line item) before Implement begins, so it cannot be silently dropped under time
  pressure the way it apparently was in both prior investigations.

---

## Data Model Review

**Findings:**
- Correct: no `AssistedCreationReferenceImage` type change is needed for a pure per-file limit
  increase; a total-request ceiling (if added) reuses the existing `sizeBytes` field via summation,
  requiring no schema change.

**Required changes:**
- [x] None.

---

## Backend Review

**Findings:**
- The conclusion that Cloud Function memory/timeout is irrelevant is correct and well-evidenced (no
  callable ever receives image bytes). This is a materially different, and simpler, situation than
  Goal #9's customer-upload feature, where Functions *do* process bytes via `sharp` — the Plan
  correctly does not import Goal #9's memory-arithmetic pattern here, since it would not apply.
- The observation that Storage Rules cannot enforce a cross-object total-request ceiling (each Rules
  evaluation only sees one object) is correct and an important constraint for Implement to respect —
  a total-request ceiling can only ever be an application-layer (client + callable) control, and the
  Plan says so explicitly.

**Required changes:**
- [x] **Required change 2 (binding):** The Plan does not explicitly state what should happen if the
  total-request ceiling is violated *after* some files in a multi-file submission have already been
  uploaded to the `pending/` prefix (i.e., the ceiling can only be checked once all files are
  selected/uploaded and their sizes are known, by which point Storage objects may already exist).
  Implement's design for the total-request ceiling must specify: is the check performed client-side
  before any upload begins (summing selected `File.size` values, preventing any upload from
  starting), or server-side in the parser (after upload, requiring cleanup of already-uploaded
  files)? Given item 15/16's already-documented "no cleanup for orphaned pending uploads" gap, a
  server-side-only check would make that gap materially worse. Implement should design the
  total-request ceiling as a **client-side pre-upload check** (summing `File.size` before calling
  `uploadBytes` for any file), with the server-side parser check remaining as defense-in-depth only —
  this must be stated as the design intent before Implement begins, not discovered mid-Implement.

---

## Testing Review

**Findings:**
- The required-coverage list (per-file boundary, total-request boundary, update-path parity,
  Storage-Rules-sync test) is proportionate and well-targeted at the actual risk surface identified
  in the investigation, not a generic test-everything mandate.
- Manual QA scope (submit at new ceiling, confirm Studio preview still resolves without falling into
  "Preview unavailable" under normal conditions) is appropriately minimal, consistent with this being
  a low-architecture-change goal.

**Required changes:**
- [x] Covered by Required Change 1 above (promote the Rules-sync test to a mandatory acceptance
  criterion).

---

## Documentation Review

**Findings:**
- Correctly defers ADR authorship to Implement (this Plan does not pre-write the decision before the
  owner has chosen a value, which would risk anchoring bias).
- The "Recommendation" framing (Option 2 backed by live precedent) is exactly the kind of
  evidence-based reasoning a future ADR reader would want to see distilled — Implement should carry
  this precedent-based rationale forward into the ADR essentially verbatim once the owner confirms.

**Required changes:**
- [x] None.

---

## Required Changes (approved_with_changes)

1. **(Security/Testing, binding)** Elevate the "Storage Rules literal matches the shared TS
   constant" automated test from a described-in-prose recommendation to an explicit, separately
   checked Acceptance Criteria line item, since this exact risk has now surfaced unresolved across
   two consecutive goals.
2. **(Backend/Architecture, binding)** Explicitly state, before Implement begins, that any
   total-request byte ceiling must be enforced as a **client-side pre-upload check** (summing
   `File.size` before any `uploadBytes` call begins), with the existing server-side parser check
   remaining as defense-in-depth only — not a server-only check that would leave partially-uploaded
   orphaned files with no cleanup path.

Neither required change expands scope or requires revisiting the Plan's file list — both are
implementation-detail tightenings within the already-approved investigation and option set.

---

## Blockers

None before Implement, provided the two required changes above are treated as binding once the owner
selects a target MB value. The owner's explicit MB-value decision remains the actual blocking
checkpoint — Implement must not proceed on any assumed default.

---

## Verdict Rationale

**approved_with_changes.** The investigation is thorough, every citation independently re-verified as
accurate, and the three-option framework is genuinely evidence-graded rather than a set of round
numbers — Option 2's live 25 MB proof-upload precedent through the identical download architecture is
a materially stronger form of evidence than either Goal #9's Workstream B outline or a typical
"reasonable-sounding number" would have produced. The two required changes close a real,
twice-surfaced manual-sync risk and a real gap in the total-request-ceiling design (upload-order vs.
check-order), both without expanding the Plan's scope or file list.

---

## Next Step

Stop here. Report the three options and the recommendation to the owner. Do not proceed to Implement
until the owner explicitly selects Option 1, Option 2, Option 3, or an alternative value with stated
rationale. Once selected, Implement must treat both required changes above as binding, and must not
begin Goal #11 (`catalog-image-derivative-storage-consolidation`) or Goal #12 (`production-release`)
regardless of this goal's outcome.
