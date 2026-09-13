# Formal Review — Staff Artwork image/title/DPI projection amendment

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Reviewer | Review Agent (Architecture + Security perspectives) |
| Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-image-title-dpi-projection-amendment-plan.md` |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Verdict | **`approved_with_changes`** |
| Environment | Docs/design only this turn; production untouched |

---

## Summary

The amendment correctly supersedes the prior neutral no-image/no-title Portal contract **without** discarding the `portalPrintRequestItems` architecture. Expanding a strict Admin-authored allowlist, enriching from `staffArtworks` only in trusted code, keeping Firestore customer deny on `staffArtworks`, and narrowing Storage to preview/thumbnail objects is the right bounded restore path.

Verdict is **`approved_with_changes`**: Implement may proceed only after owner acceptance, and must follow the required changes below (Upscale deferred unless owner overrides; Storage residual-risk acceptance recorded; population APPLY remains a separate checkpoint; visibility/`designId` fix preserved).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Projection expand + UI + narrow Storage; no broad staffArtworks client reads |
| Architecture alignment | pass | Keeps UI → service → projection; Admin enrichment in synchronizer |
| Security impact addressed | pass with notes | Residual authenticated preview IDOR documented; tighter signed-URL fallback named |
| Data model impact addressed | pass | Additive projection fields; no canonical schema rewrite |
| Backend impact addressed | pass | Trigger enrichment + optional staffArtworks refresh; sizing callable unchanged |
| Test strategy adequate | pass | Mapper/privacy, Rules/Storage, population UPDATE, UI contracts |
| Human checkpoints identified | pass | Accept Implement; separate APPLY; Owner DEV QA; Signoff later |
| Roadmap alignment | pass | Unblocks contested Owner QA under parent readiness |
| Documentation plan | pass | DATA_MODEL + QA checklist on Implement |
| No silent scope expansion | pass | Upscale/enhance Portal controls deferred unless owner adds them |

---

## Architecture Review

**Findings:**

- Preferred flow (`printRequestItems` → Admin projection → `portalPrintRequestItems` → Portal) remains intact and is the correct customer boundary.
- Admin enrichment from `staffArtworks` at projection time is appropriate; Portal must not regain `getDoc(staffArtworks)`.
- Projecting paths + client `getDownloadURL` matches catalog/upload patterns and avoids a new callable unless Security elevates.
- Staff Artwork document refresh → reproject attached items is correctly recommended so title/preview/DPI stay truthful after library edits.
- Keeping `updatePortalStaffArtworkPrintRequestItemSize` as the authoritative save validator avoids trusting client-projected pixels alone for mutations.

**Required changes:**

- [x] During Implement, treat staffArtworks→reproject as **in scope** (not optional follow-up) so acceptance criterion “realtime updates work” covers library-side title/preview changes where indexed query cost is acceptable.
- [x] Preserve the visibility mapper rule: Staff Artwork mapping must not require `designId`.

---

## Security Review

**Findings:**

- Owner explicitly allows customer-visible preview, title, DPI inputs, and `staffArtworkId`. Projection allowlist matches that decision and continues to exclude notes, production paths, archive/AI-review/audit extras.
- Firestore customer deny on `staffArtworks` must remain.
- Narrow Storage read of `preview.webp` / `thumbnail.webp` for authenticated customers restores image UX without reopening production originals.
- Residual risk: any signed-in customer who learns a `staffArtworkId` could fetch that preview/thumb. Given owner non-sensitivity of the ID and customer-intended previews, this is acceptable for DEV/product direction **if recorded**. If later product wants cross-customer isolation of previews, switch to ownership-checked signed URLs keyed by request item ID.

**Required changes:**

- [x] Implementation must **not** allow customer Storage reads of `production.png`, `production.interactive.png`, `source`, or other non-preview objects under `/staff-artwork/`.
- [x] Do not restore Portal client reads of `staffArtworks` documents.
- [x] Record residual preview IDOR in the Implement/Test evidence (and RISK note if promoting beyond DEV).
- [x] Population script may Admin-**read** `staffArtworks` for enrichment only; still no staff/canonical/Storage mutation except `portalPrintRequestItems` on APPLY.

---

## Data Model Review

**Findings:**

- Additive projection fields are clear and typed.
- Using `titleSnapshot` for the customer-facing title reuses an existing Portal field name already used for catalog/upload display fallbacks — acceptable if staff branch documents that for `staff_artwork` it carries the Staff Artwork title.
- `widthPx`/`heightPx` on the projection are the right DPI inputs; do not treat stored library `effectiveDpi` as live size authority.

**Required changes:**

- [x] Update `DATA_MODEL.md` / Portal projection docs during Implement to list the new staff allowlist and state that prior “never populate title/preview for staff” language is superseded.

---

## Backend Review

**Findings:**

- Synchronizer enrichment and population enrichment must converge on the **same** shared mapper output.
- Sizing callable needs no required change.
- Indexes: confirm/add any composite needed for `printRequestItems` where `staffArtworkId ==` refresh query; additive only, no `--force`.

**Required changes:**

- [x] Before DEV dry-run after Implement, ensure any new index for staffArtworkId item lookup is READY if the refresh trigger is deployed.

---

## UI/UX Review

**Findings:**

- Restoring preview, real title, and DPI bands addresses the owner screenshots.
- Keep `sourceLabel` / STAFF-ADDED as the **source pill**, not as the only title when `titleSnapshot` exists.
- Do not display raw `staffArtworkId` as the title.
- Deferring Upscale/enhance Portal controls is correct unless the owner adds them; baseline DPI from projected pixels satisfies the stated acceptance list.

**Required changes:**

- [x] Amend Owner DEV QA checklist expectations: title = artwork title; preview visible; DPI bands restored; neutral-only placeholder is **fail**.

---

## Test Review

**Findings:**

- Prior tests that asserted “no title/preview/pixels on staff projection” must be rewritten to the new allowlist and to assert continued exclusion of notes/production/enhance paths.
- Population tests must flip from “no staffArtworks read” to “enrichment read allowed; writes still projection-only.”
- Storage suite must prove production deny + preview allow.

**Required changes:**

- [x] None beyond executing the plan’s test matrix honestly before APPLY.

---

## Human Checkpoints

1. **Now:** Owner accept amendment + authorize Implement → Test → DEV prep/dry-run (no APPLY).
2. **After dry-run:** `OWNER AUTHORIZATION: DEV REPOPULATE PORTAL PRINT REQUEST PROJECTIONS FOR STAFF ARTWORK FIELDS - APPLY`
3. **After APPLY + VERIFY + Rules/Storage as needed:** `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective`
4. Signoff only after QA PASS.

---

## Verdict

**`approved_with_changes`**

The design is implementation-ready after owner acceptance. Required changes are binding constraints for Implement, not blockers to planning.

### Exact recommended projection fields (confirmed)

For `staff_artwork` rows on `portalPrintRequestItems`:

- existing request fields (`id`, `printRequestId`, `sourceType`, quantity/size/status/timestamps/sortOrder/`addedBy`)
- `sourceLabel: "Staff-added"` (badge)
- `titleSnapshot` (artwork title)
- `staffArtworkId`
- `previewStoragePath`, `thumbnailStoragePath`
- `widthPx`, `heightPx`
- optional `artworkBackgroundHex` when present

### Image delivery (confirmed)

Projected paths + client `getDownloadURL` + Storage customer read limited to `preview.webp` / `thumbnail.webp`.

### DPI (confirmed)

Projected pixels + existing `assessPrintRequestItemSize` bands; trusted sizing callable unchanged.

### `staffArtworkId` (confirmed)

Include on projection; do not show as UI title; do not restore document reads.

---

## Exact next owner checkpoint

> **OWNER ACCEPT STAFF ARTWORK IMAGE/TITLE/DPI PROJECTION AMENDMENT + AUTHORIZE IMPLEMENT**

After that: Implement → Test → DEV Functions/Storage prep → population **DRY RUN** → stop for APPLY authorization.

**This review does not authorize:** Implement, APPLY, Rules/Storage deploy, Signoff, staging, commit, push, freeze, or production action.
