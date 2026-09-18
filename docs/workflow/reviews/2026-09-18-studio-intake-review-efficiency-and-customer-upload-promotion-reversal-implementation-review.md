# Studio intake review efficiency and Customer Upload promotion reversal — Independent Implementation Review

Date: 2026-09-18  
Phase: `studio-intake-review-efficiency-and-customer-upload-promotion-reversal`  
Gate: Independent Implementation Review

## Scope reviewed

The implementation was reviewed against the accepted Plan and Formal Review, including:

- the narrow callable authorization, provenance, status, approval, companion, and downstream-reference guards;
- the invalidate → canonical Storage cleanup → final transaction recheck → design retirement → Customer Upload Excluded lifecycle;
- preservation of the Customer Upload, `promotedAt`, request/allocation history, consent, technical fields, and customer-upload assets;
- attempt-identity invalidation plus local pending/background queue cancellation without claiming provider cancellation;
- the dedicated single-item **Undo Promotion & Exclude** action and confirmation copy;
- intake `a` / `r` shortcuts, existing arrow navigation, Shift+click range selection, serial bulk actions, and truthful partial-result reporting;
- immediate ordinary Exclude, retained Delete Upload and Restore confirmations, derivative-only larger previews, and unchanged Auto / Light / Dark / Halftone behavior.

## Evidence

- `functions/src/returnCustomerUploadToIntakeAndExclude.ts` performs the reviewed two-transaction lifecycle and calls the shared strict canonical design-asset cleanup helper.
- `functions/src/enqueueAiEnrichment.ts` rejects stale Customer Upload enqueue work after the upload leaves AI Review.
- `functions/src/deleteEligibleUnapprovedDesign.ts` retains the owner-only status, active-stage, provenance, companion, and downstream-reference blockers; only the shared helper extraction changed.
- No Firestore Rules, Storage Rules, indexes, migrations, backfills, or production deployment were added for this phase.
- No bulk AI Review reversal path was added.

## Automated evidence reviewed

- Functions TypeScript/build: **PASS** — `npm run build` from `functions`.
- Studio typecheck: **PASS** — `npx tsc -p tsconfig.json --noEmit` from `apps/studio`.
- Studio production package build: **PASS** — `npm run build:studio`.
- Targeted contracts: **PASS** — 54 tests, 54 passed, 0 failed.
- Lint for the exact changed TypeScript implementation/test files: **PASS**.
- `git diff --check`: **PASS**.
- Repository-wide lint remains blocked by existing violations outside this phase, including unrelated design-tag, print-request-rule-test, show-rail, deletion-warmup-test, identity-snapshot, and show-recovery files. No phase-owned file was reported by that failure after the targeted lint pass.

## Verdict

**Approved for the authorized narrow DEV Functions deployment.**

The implementation satisfies the accepted scope and does not require a new durable audit field or owner decision. Owner DEV QA remains required after deployment; this review is not a Signoff or production-release approval.

## Final-candidate independent re-review — 2026-09-18

The post-DEV-QA candidate was reviewed again against the accepted Plan, Formal Review, and owner
decisions. The additional intake selection/removal reconciliation, responsive preview layout,
overflow-menu positioning, and exact bulk action labels remain within the approved intake UX
scope. The Excluded newest-first query/index experiment was removed from this goal; the separate
Halftone/index work remains uncommitted and is not part of this rollout.

### Final findings

- The reversal remains a dedicated single-item AI Review action labelled **Undo Promotion & Exclude**.
- Server eligibility remains narrow: `sent_to_ai_review` or the protected `staff_review` retry
  state, technically ready, ownership confirmed, exact Customer Upload provenance, pre-ready
  unapproved design, and no print-item, show-allocation, companion, or denormalized companion
  references.
- The lifecycle remains invalidate attempt → strict canonical derived-asset cleanup → final
  transaction recheck → delete retired design → clear only `promotedDesignId` and set Excluded.
- The generic `deleteEligibleUnapprovedDesign` Customer Upload provenance guard is preserved.
- Original Customer Upload/request/allocation/consent/technical data and customer-upload assets
  remain preserved; `promotedAt` remains preserved.
- Local queue cancellation removes/skips pending IDs only; provider cancellation is not claimed.
- Intake uses `a`/`r`, ArrowUp/ArrowDown, shared Shift+click range selection, serial bulk actions,
  and truthful partial-result reporting. Bulk labels are **Send Selected to AI Review** and
  **Exclude Selected**.
- Preview uses the existing derivative `previewUrl`, with responsive contain sizing and existing
  Auto / Light / Dark / Halftone controls.
- No Rules, Storage Rules, indexes, Portal, migration, backfill, schema, or data rewrite is in
  the final candidate.

### Final automated evidence

- Backend focused contracts: **27/27 passed**.
- Studio focused contracts covering AI Review, queues, intake, selection, preview, and menus:
  **115/115 passed**.
- Backend TypeScript build: **PASS**.
- Studio typecheck: **PASS**.
- Studio production package build: **PASS** (existing Electron/Vite warnings only).
- Exact changed-TypeScript ESLint: **PASS**.
- `git diff --check`: **PASS**.
- Repository-wide lint: **fails only on 14 existing errors and 1 existing warning outside this
  phase**; no phase-owned file is reported.

### Re-review verdict

**Approved for Owner DEV QA PASS and Signoff.** The candidate has no goal-scoped unresolved
failure and introduces no unexpected production surface.
