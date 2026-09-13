# Plan: Print request detail — customer upload library consent (unobtrusive)

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Planning Agent |
| Status | ready_for_review (revised) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-08-print-request-upload-library-consent-detail-review.md |

---

## Goal

On Studio Print Request **item thumbnails**, show a **small corner icon** indicating whether the uploader approved Design Library use (`catalogUseAcknowledged`). Show **only** on customer-uploaded items (not catalog-only, not assisted-creation copies). No request-header text summary.

## Background

Owner initially asked for compact request-level detail; after seeing the timestamp meta line, preferred **per-image icons**: green check (approved) / red X (denied) in the **upper-left** of each upload thumbnail.

## Scope

### In Scope
- Keep `catalogUseAcknowledged` on `StudioCustomerUploadSummary` / card upload summary mapping.
- Per-item icon on `PrintRequestItemCard` thumb (upper-left); source badge stays upper-right.
- Icons only when consent is known `true` / `false`; omit for pending/legacy `null` and for assisted/catalog items.
- Remove the request-detail header consent text line.
- Helper + unit/contract tests; CSS for quiet corner chip.
- Workflow docs + state.

### Out of Scope
- Lightbox overlay icons (unless trivial reuse later).
- Intake workflow changes; persisting consent on print request docs.
- Rules, Functions, migrations, indexes.
- Commit / push / publish / production.

---

## Affected Areas

### Files / Modules (expected)
- `customerUploadReadService.ts` (already maps consent)
- `printRequestCustomerUploadConsentSummary.ts` → resolve per-item icon state (+ tests)
- `PrintRequestItemCard.tsx` + `print-requests.css`
- `PrintRequestsPage.tsx` — pass consent on upload mapping; remove header line
- Contract tests

### UI / UX Impact
- Small green check / red X chip, upper-left of upload thumbs only. Manual visual QA.

---

## Approach

1. Map `catalogUseAcknowledged` through upload summary → card props.
2. `resolvePrintRequestItemLibraryConsentIcon(item, upload)` → `"approved" | "denied" | null`.
3. Render Lucide `Check` / `X` with aria-label for library consent; no icon when `null`.
4. Remove `customerUploadConsentSummary` header UI.
5. Tests: catalog/assisted/pending → null; true → approved; false → denied.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Icon resolver unit test | `npx tsx --test` | yes |
| Contract: card icon classes / no header line | same | yes |

### Manual
- Catalog-only thumbs → no consent icon.
- Customer upload approved → green check upper-left.
- Customer upload denied → red X upper-left.
- Assisted-creation → no consent icon.
- Pending/legacy → no icon.

---

## Human Checkpoints Anticipated
- Owner visual QA (icon size/placement/clutter).
- Commit/push/publish separately gated.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Overlaps source badge | Opposite corners (left vs right) |
| Low contrast on busy art | Small solid chip behind icon |

**Rollback:** Revert card icon + mapping; keep or drop summary field as needed.

---

## FreshForge Impact Classification
- App code: Studio print-requests + customer-upload read summary
- Documentation: workflow artifacts
