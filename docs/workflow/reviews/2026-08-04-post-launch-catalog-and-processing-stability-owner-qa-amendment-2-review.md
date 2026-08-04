# Amendment 2 Formal Review (PR #40)

## Defect A
**Confirmed.** Re-read `useAiReviewInbox.ts:305-344` directly: listener is single-document,
scoped to `selectedDesignId`; its `needs_review` effect calls only `reloadDesigns()`. Fix (add
`onQueueChanged?.()` to the same effect) is minimal and reuses the existing subscription — no new
listener introduced. No blocker.

## Defect B
**Confirmed, re-verified independently.** `pngValidator.ts:163` checks `fileStats.size` (pre-trim,
pre-upscale, on-disk original) only. No re-check of the final buffer exists in
`importUploadService.ts` or callers before `uploadBytesResumable`. `storage.rules:61-65`
(`isValidOriginalUpload`) independently enforces the same 150 MB ceiling server-side on the actual
uploaded bytes. This is a real, non-Rules explanation fully consistent with all reported evidence
(validation/trim/normalization succeed pre-upload; failure is upload-time). No Rules/IAM/App
Check/bucket change proposed or required. Fix is a client-side pre-upload size check reusing
existing constants/message helpers. No blocker.

## Defect C
**Confirmed correctly stopped.** Independently re-checked `aiReviewState.ts:95-125`:
`aiReviewedAt` is written identically by `buildAiReviewApprovedFields` and
`buildAiReviewRejectedFields` — not a ready-transition-specific field. No other candidate field
found. Plan's requirement for a new field + index + owner approval is correct and matches the
governing stop condition. Correctly not implemented.

## Verdict
**approved_with_notes** (Defect C blocked on owner approval; A and B are clear to implement).
Proceeding with A and B now; C remains blocked pending:
`APPROVE READY-TRANSITION TIMESTAMP FIELD AND INDEX`
