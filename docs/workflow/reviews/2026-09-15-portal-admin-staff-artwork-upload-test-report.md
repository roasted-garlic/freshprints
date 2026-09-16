# Portal Admin Staff Artwork Upload — Test Report

| Field | Result |
|---|---|
| Goal | `portal-admin-staff-artwork-upload` |
| Test gate | **corrective validation passed with notes; Owner DEV QA PASS**; latest FAIL history is preserved below |
| Automated evidence | **86/86 latest Workstream B focused tests passed**; prior Workstream A and combined evidence remains recorded below |
| DEV deployment | **passed** — only `promoteStaffArtworkToAiReview`, `reprocessReadyDesignWithAi`, and `enqueueAiEnrichment` deployed to `fresh-prints-dev` |
| DEV runtime status | **ACTIVE** — revisions `promotestaffartworktoaireview-00008-daj`, `reprocessreadydesignwithai-00032-gab`, and `enqueueaienrichment-00127-vod` |
| Owner DEV QA | **PASS** — Owner confirmed all Portal and Workstream B corrective retests; record in `2026-09-15-portal-admin-staff-artwork-upload-owner-dev-qa-checklist.md` |

## Owner DEV QA failure and corrective record

Owner DEV QA reported **FAIL** for Workstream A: selecting a valid PNG in Portal Admin appeared
to do nothing, with no queued row, progress, result, or bounded error. The failure is retained as
history; this report is not a Signoff.

The actual client trace identified the stop point:

1. The file input `onChange` called `upload.addFiles(...)`.
2. `usePortalAdminStaffArtworkUpload` used a `mountedRef` whose cleanup set `current` to false but
   whose next effect setup did not re-arm it. React development Strict Mode performs that cleanup /
   setup cycle, so the later `addFiles` call skipped `setItems(...)` (and `setSelectionError(...)`).
   State therefore stayed empty, `queuedCount` stayed zero, and the Start upload button remained
   disabled; this exactly explains the silent no-op.
3. The old `localItemId` also called `crypto.randomUUID()` unguarded before `setItems(...)`. A browser/
   tunnel runtime without a usable UUID API could independently abort the same selection handler.
   The service had the same unguarded ID generation immediately before the first callable.

Corrective implementation: the mount guard is re-armed during every effect setup, and both IDs now
use a shared client-ID helper that uses `randomUUID` when available and a bounded local fallback
when absent or throwing. The existing Staff Artwork callables, canonical storage path, resumable
upload, finalize flow, sequential processing, and owner/admin gate were not changed. The regression
verifies both the Strict Mode mount-guard contract and the no-`randomUUID` path still create a queue
item while keeping the wired Uploading/Processing/Ready/Failed UI contract visible.

The browser automation session was unavailable in this environment, so no live Portal console or
network capture is claimed. The source trace, focused regression, typecheck, and targeted lint are
recorded; Owner DEV QA must perform the live retest below.

## Prior implementation checks (retained)

| Check | Result |
|---|---|
| Portal admin, upload, auth-return contracts | 21 passed |
| Functions AI reprocess/enqueue contracts and core tests | 33 passed |
| Studio AI Review, Design Library, Staff Artwork, catalog approval tests | 66 passed |
| Staff Artwork Firestore/Storage emulator regressions | 9 passed |
| Portal typecheck | passed |
| Studio `npx tsc --noEmit -p apps/studio/tsconfig.json` | passed |
| Functions `npm run build` | passed |
| Targeted Portal lint | passed |
| Changed-file Studio lint target | passed |

## Corrective checks

| Check | Result |
|---|---|
| Combined goal-focus regression suite | **88/88 passed**, including the no-silent-no-op regression |
| Portal corrective contract regression | passed — valid-file selection remains queued without `crypto.randomUUID`; action/status/error wiring is present |
| Portal typecheck | passed |
| Targeted Portal + changed-file Studio lint | passed |
| Studio `npx tsc --noEmit -p apps/studio/tsconfig.json` | passed |
| Functions `npm run build` | passed as the deployment predeploy build |
| `git diff --check` | passed; Git reported only existing LF/CRLF normalization warnings |
| Post-deploy unauthenticated callable smoke | passed — both exact DEV endpoints returned expected `401 UNAUTHENTICATED`; no data/AI mutation attempted |

## Build note

`npm run build:portal` was attempted and stopped at Next.js writing the ignored generated file
`apps/portal/.next/trace` with Windows `EPERM`. No source or tracked generated file was changed to
work around that environment limitation. The Portal typecheck and targeted lint passed.

The broader Studio feature-directory lint remains non-clean on eight pre-existing unused-variable
errors in unmodified files (`TagManagementModal.tsx`, `useCatalogTags.ts`, and
`designLibrarySearch.ts`) plus two pre-existing Fast Refresh warnings in
`SmartProfileDimensionListsView.tsx`. The lint target containing changed files is clean.

## Scope audit

- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and `firebase.json` are unchanged.
- Actual Workstream B Functions runtime bytes are present in the diff through the canonical AI
  pipeline, Staff Artwork diagnostics, and their three affected exported entry points:
  `promoteStaffArtworkToAiReview`, `reprocessReadyDesignWithAi`, and `enqueueAiEnrichment`.
  Only those three Functions were deployed to `fresh-prints-dev`; all three are ACTIVE at the
  revisions listed above. No unrelated Function was deployed.
- The latest corrective delta is not Portal-only: `functions/src/staffArtwork.ts` changed for safe
  promotion diagnostics, and the existing `createStaffArtworkUpload` / `finalizeStaffArtwork`
  runtime remained unchanged.
- No Portal App Hosting publish was performed; Portal DEV remains localhost plus the
  `myprintrequest.dev` tunnel.
- No migration, backfill, secret, IAM change, production action, commit, or push was performed.
- Canonical reprocess demotes Ready + approved into normal imported + pending AI Review lifecycle,
  clears any obsolete `aiReprocessState` marker, and uses the existing AI pipeline/settings/queue.

## Latest Owner DEV QA FAIL — Workstream B corrective record

Owner DEV QA reported **FAIL** for Staff Artwork bulk Send to AI Review and for the previously
approved Ready-preserving Design Library lifecycle. This section is the current corrective result;
the earlier Portal upload FAIL and original Ready-preserving implementation history remain above.

### Staff Artwork 400 investigation

The actual call chain was traced as `StaffArtworkPage` → `runAiReviewBulkReprocess` →
`staffArtworkService.promote` → `promoteStaffArtworkToAiReview`. Bulk and the existing single-item
path use the same service and exact callable payload `{ staffArtworkId }`; no bulk-only payload,
stale-ID transformation, forced enqueue, or authorization mismatch was found in source.

The historic DEV traces show authenticated requests (`VALID`) ending in HTTP 400, but Cloud Logging
did not retain request bodies or an application-level error/message/details record. Therefore the
exact historic selected ID cannot be reconstructed honestly. The proven server-side error class is
the callable's `failed-precondition`: the source rejects active deletion blockers before promotion,
or rejects a non-Ready/missing-production-path record. Read-only DEV inspection found concrete
current blocker records:

| Staff Artwork ID | Current state | Active references |
|---|---|---|
| `DzgUSAYAB3ZxtsPky82P` | ready, not_promoted | 1 print-request item; 1 allocation |
| `FzXAsMbOzcPL2v6E0543` | ready, not_promoted | 2 print-request items; 3 allocations |
| `Zgzl4m6tTbxfdgus3XdD` | ready, not_promoted | 1 print-request item; 1 allocation |
| `lacXDABhICoKJvSyEUxJ` | ready, not_promoted | 1 print-request item; 1 allocation |
| `nVcdReBfRZFLP1JOP4US` | ready, not_promoted | 1 print-request item; 1 allocation |

These are safety-blocked, not valid promotion candidates, and were not mutated. The corrective
adds safe server `reason`/blocker/record-state diagnostics and preserves the deletion guard. The
client now retains bounded callable code/message/details so this class of failure is no longer only
`400 Bad Request`. A clean, ready, unreferenced Staff Artwork record should follow the same callable
operation for single and bulk.

### Design Library lifecycle and Retry-failed investigation

The rejected hybrid behavior came from the Ready-preserving `aiReprocessState`/`ready_reprocess`
seam: raw Ready/approved records remained in the normal Design Library while enqueue logs reported
successful AI work, so two UI surfaces became authoritative and reconciliation could classify a
successful `ready_for_review` handoff as failure. The corrective removes that seam and restores the
canonical lifecycle:

`ready + approved` → `imported + pending` normal AI Processing/AI Review → normal approval →
`ready + approved`.

Single and bulk Design Library actions now share this lifecycle. Accepted handoff removes the item
from the normal Ready browse, Auto on uses the existing enqueue contract, Auto off waits for normal
manual Start AI, and normal Processing/Needs Review/Rejected retry, archive/delete, and multi-select
rules apply. Result accounting treats accepted/already-terminal outcomes as success and only actual
failed status/stage as failure. Obsolete field/query/display/eligibility special cases were removed;
the reprocess write clears any leftover marker. Read-only DEV inspection found five archived records
with obsolete `aiReprocessState: needs_review` metadata; none was restored or mutated.

### Full-card Multiple Select corrective

Both Studio libraries now make the whole eligible card the selection target while Multiple Select is
active. Image, title, background, and normal card content toggle selection; a second click toggles
off; normal details/preview behavior is suppressed; selected state is visually obvious and exposed
with `aria-pressed` where the card supports it; Enter/Space toggles keyboard-interactive cards.
Exiting Multiple Select immediately restores normal details/preview behavior. Neither library had
existing Shift+click range selection, so no supported range behavior was changed.

### Latest focused validation and deployment

The latest Workstream B focused run passed **86/86**: 55 Studio-side tests (Design Library card,
Staff Artwork card/promotion diagnostics, lifecycle, permissions, and AI Review) plus 31 Functions-side tests
(canonical demotion/enqueue and atomic guards). Studio typecheck, Portal typecheck, Functions build,
changed TypeScript lint, and `git diff --check` passed. A first Firebase command exceeded the local
120-second output window after updates began; `gcloud functions describe` then confirmed successful
ACTIVE deployment for all three exact exports at the revisions in the table above. Safe
unauthenticated POST probes returned `401` for all three; no authenticated mutation was attempted.

The full-card and callable diagnostic regression files are:

- `apps/studio/src/renderer/src/features/designs/components/designCardMultiSelect.contract.test.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/utils/staffArtworkCallableErrorMessage.test.ts`

## Owner DEV QA result — PASS

Owner DEV QA confirmed the Portal upload correction and all required Workstream B corrective retests
passed: full-card selection and modal suppression/restoration in both libraries; valid clean Staff
Artwork bulk promotion with safety blockers still enforced; single-item parity; Auto-process ON/OFF;
canonical Design Library demotion into normal AI Review and return to Ready after approval; and no
false Retry failed classification. No Signoff or production action is represented by this report;
the Signoff is recorded separately.
