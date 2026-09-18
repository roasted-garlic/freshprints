# Final Signoff — Studio intake review efficiency and Customer Upload promotion reversal

| Field | Value |
|---|---|
| Date | 2026-09-18 |
| Goal | `studio-intake-review-efficiency-and-customer-upload-promotion-reversal` |
| Plan | `docs/workflow/plans/2026-09-17-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-17-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-formal-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-18-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-implementation-review.md` |
| Owner DEV QA | **PASS** — `docs/workflow/reviews/2026-09-18-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-owner-dev-qa.md` |
| Disposition | **Approved for protected production rollout** |

## Signoff basis

The accepted implementation, final independent re-review, automated evidence, narrow DEV
deployment, and Owner DEV QA PASS satisfy the managed-phase gates. The production rollout is
authorized only within the reviewed backend allowlist and the next Studio stable release.

## Implemented lifecycle

`validate provenance/eligibility → invalidate active AI attempt → safely remove derived design
assets → final transaction recheck → delete retired pre-ready design → return Customer Upload to
Excluded`.

The operation preserves the original Customer Upload, request artwork/history, request items,
allocation history, consent, technical fields, `promotedAt`, and customer-upload assets. It
clears only the active `promotedDesignId` backlink after the derived design is safely retired.
The generic `deleteEligibleUnapprovedDesign` Customer Upload provenance guard is unchanged.

## Eligibility boundary

Only a technically ready, ownership-confirmed Customer Upload in AI Review (or the protected
staff-review retry state) with an exact source/backlink pair and a pre-ready, unapproved design
is eligible. Ready, approved/catalog-ready, archived, imported, Staff Artwork, mismatched,
companion-linked, print-request-item-referenced, show-allocated, or otherwise downstream-used
designs are rejected server-side. No bulk AI Review reversal exists.

## UX and race safety

- AI Review action: **Undo Promotion & Exclude**, single item only, with the approved warning copy.
- Intake: `a` sends to AI Review, `r` excludes, ArrowUp/ArrowDown retain navigation, and
  Shift+click range selection uses the shared selection primitives.
- Bulk intake actions run serially as **Send Selected to AI Review** and **Exclude Selected** and
  report partial success/failure truthfully.
- Ordinary Exclude is immediate; Delete Upload and Restore retain confirmation gates.
- Previews use the existing derivative and preserve Auto / Light / Dark / Halftone behavior.
- Pending local/background queue IDs may be removed or skipped. No provider cancellation is
  claimed; attempt identity invalidation prevents stale writes from resurrecting the design.

## Automated evidence

- Backend focused contracts: **27/27 pass**.
- Studio focused contracts: **115/115 pass**.
- Release-policy contracts: **30/30 pass**.
- Functions build: **pass**.
- Studio typecheck: **pass**.
- Studio `1.0.16` production package build: **pass**.
- Exact changed-TypeScript lint: **pass**.
- Studio release lint: **pass** (`current=15`, `baseline=25`, `new=0`).
- Package version parity: **pass** (`1.0.16`).
- `git diff --check`: **pass**.
- Repository-wide lint: **14 unrelated errors and 1 unrelated warning**, with no phase-owned
  file reported.

## Production rollout record

To be completed in the same closeout pass with exact live identifiers:

- Final development SHA: pending
- Protected PR: pending
- Production merge SHA: pending
- Functions deployed: pending exact verification
- Rules / Storage Rules / indexes / Portal / IAM / secrets / Firebase config / data: unchanged
- Studio version: `1.0.16`
- Release workflow run: pending
- GitHub Release ID: pending
- Canonical asset count: pending (expected 8)
- Latest verification: pending
- Production verification: pending

## Owner DEV QA checklist

Owner DEV QA PASS covered the implemented candidate. Post-rollout bounded verification must confirm:

1. The exact three Functions are ACTIVE in production.
2. No Rules, Storage Rules, indexes, Portal, IAM, secrets, config, migration, backfill, or data
   rewrite changed.
3. Stable Studio `1.0.16` is published, Latest, pinned to the production merge SHA, and has the
   eight canonical assets.
4. The new callable rejects unauthenticated access without mutation.
5. FreshForge state and the durable handoff are updated to **DONE / IDLE**.
