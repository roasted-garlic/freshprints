# Amendment 2 Plan (PR #40)

Builds on Amendment 1. See prior Plan/Review/Test Report/Implementation Review for architecture
context — not repeated here.

## Defect A — AI Processing reconciliation (backend-initiated completion)

**Root cause (confirmed, `useAiReviewInbox.ts:305-344`):** the only live reconciliation is a
single-document listener scoped to `selectedDesignId` (`designDocumentSubscriptionService.subscribeToDesign`).
Its effect only calls `reloadDesigns()` — never a count reload — and only fires when the *currently
selected* design's live doc flips to `needs_review` while `filters.tab === "processing"`. Any design
that completes **without being the live-selected one** (the reported case — "already appears under
Needs Review" but Processing list/count are stale) has zero reconciliation path. Amendment 1 fixed
client-initiated completions (`onQueueChanged` in `useAiProcessingQueue.ts`); this is the
backend-initiated case, a different gap.

**Fix:** extend the existing bounded per-selection listener's effect to also call
`options?.onQueueChanged?.()` alongside `reloadDesigns()`. This reuses the existing subscription —
no new listener. For designs completing while *not* selected: no listener is added (would violate
the no-full-listener constraint); instead, `reloadDesigns()`/count reload already happens on any tab
navigation and on the existing 32ms-settled patch path. Given the specific owner reproduction is "the
processing design already shows in Needs Review" (i.e., it was being watched — selected — during
completion), the listener-scope fix directly addresses the reported case. Bounded: reuses the
existing one-document listener; no full designs listener, no per-design listener array, no
permanent polling.

**Files:** `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (the
`liveDesign`/`needs_review` effect, ~line 336).

**Test:** simulate `liveDesign.aiReviewStatus` flipping to `needs_review` while tab is `processing`
and assert both `reloadDesigns()` and `onQueueChanged()` fire (source-assertion test, matching
existing convention in this file's sibling tests).

## Defect B — Storage upload authorization

**Root cause (confirmed, not a Rules/IAM defect):** `pngValidator.ts:163` checks only
`fileStats.size` — the **original on-disk file**, pre-trim/upscale — against
`MAX_SINGLE_PNG_SIZE_BYTES` (150 MB). No re-check exists anywhere on the **final uploaded buffer**
(post-trim, post-upscale) before `uploadBytesResumable` in `importUploadService.ts`. `storage.rules`'s
`isValidOriginalUpload()` independently enforces the same 150 MB ceiling server-side
(`request.resource.size < 150 * 1024 * 1024`) on the bytes actually received. A source file at or
under 150 MB that upscales/re-encodes to a larger final buffer legitimately exceeds the Rules ceiling
and is correctly rejected as `storage/unauthorized` — the client just never told the user why, mapping
any `storage/unauthorized` to a generic permission message. This matches all reported evidence:
validation/trim/normalization all read pre-upload state and succeeded; the failure is upload-time,
server-side, and legitimate.

**No Rules/IAM/App Check/bucket change required or proposed.** This is a client-side validation gap
producing a misleading error message, not an authorization defect. Not comparable to the prior
Storage↔Firestore IAM incident (that was a genuine cross-service permission gap; this is a client
validation-boundary gap with the server correctly enforcing its own contract).

**Fix:** re-check the final upload buffer's byte length against `MAX_SINGLE_PNG_SIZE_BYTES` before
calling `uploadBytesResumable`, throwing the existing `ImportLimitExceededError`/size-limit message
(reused, not a new error type) instead of attempting an upload doomed to fail. This gives the owner
an accurate, actionable error instead of a false permission message, and avoids a wasted upload
attempt. No retry-with-token-refresh is warranted — the failure is not auth-readiness-related.

**Files:** `apps/studio/src/renderer/src/features/imports/services/importUploadService.ts`
(`uploadOriginalPng`), reusing `MAX_SINGLE_PNG_SIZE_BYTES` and the existing
`formatPngSizeLimitExceededMessage`/size-limit message pattern already used in `pngValidator.ts`.

**Test:** call `uploadOriginalPng` with a byte buffer whose length exceeds `MAX_SINGLE_PNG_SIZE_BYTES`
and assert it throws the accurate size-limit message without calling `uploadBytesResumable`.

## Defect C — ready-transition ordering

**No canonical "transition into ready" timestamp exists.** `aiReviewedAt` is the only adjacent field
and is written identically on both approve *and* reject (`aiReviewState.ts:95-125`) — it is "last AI
review action," not "became ready." Using it would incorrectly reorder on rejection-adjacent writes
and does not satisfy "reprocessing and reapproving an older design moves it to first" cleanly since a
design can pass through `aiReviewedAt` writes without ever reaching `ready`.

**STOP per instruction.** No suitable field exists. Implementing this requires one of: (a) a new
`readyAt` timestamp field written only on the `ready` transition (`applyCatalogApprovalUpdate`'s
approve path) plus a new/adjusted Firestore composite index (`status ASC, readyAt DESC, __name__ DESC`)
and Portal generated-asset field, or (b) a legacy-record fallback strategy for designs approved before
the field existed. Both require explicit owner approval (new field + index + Portal snapshot schema
change is exactly the class of change flagged as out-of-scope-without-approval in the base Plan).

**Required approval phrase to proceed:**
`APPROVE READY-TRANSITION TIMESTAMP FIELD AND INDEX`

## Acceptance criteria

- A: Processing count and list reconcile immediately when the selected design completes in the
  background; no new listener; existing one-document listener reused.
- B: oversized final buffer produces an accurate size-limit error before upload attempt; normal
  uploads unaffected; no Rules/IAM change.
- C: blocked pending owner approval of the new field/index.

## Checkpoints

- Defect C: STOP after Plan + Review, pending the approval phrase above.
- Defect B: no Rules/Storage Rules/IAM change — proceeding without a stop.
- Deploy: no Functions changed by A or B (both are Studio-renderer-only) — no dev deploy needed for
  this Amendment.
