# Review: Library OG rotation interval + per-design artwork backgrounds

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is clear, additive, and correctly sequences a small rotation-interval slice before the main per-design background work. Security posture (validate hex; compose from design doc, not client `bg` query) and soft-deploy-only gate match project rules. Implement may proceed with the required changes below — no plan rewrite needed.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Catalog card + lightbox + Studio design mats; AC/request mats deferred |
| Architecture alignment | pass | Shared helpers; services/hooks; Functions compose |
| Security impact addressed | pass | Hex validation; ready-only public image; paint from doc |
| Data model impact addressed | pass | Additive fields + defaults; no backfill |
| Backend impact addressed | pass | Settings callable + OG Functions; soft-deploy dev |
| Test strategy adequate | pass | Unit + typecheck + Functions build + manual Debugger |
| Human checkpoints identified | pass | Studio/Portal UI + FB scrapes |
| Roadmap alignment | pass | Extends prior OG/social sharing work |
| Documentation plan | pass | DATA_MODEL, DEPLOYMENT, DECISIONS |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Interval and hex helpers belong in `packages/shared`; UI must not invent validation.
- Portal catalog mapping must include `artworkBackgroundHex` for mats; OG path already Function-first.

**Required changes:**
- [x] Prefer one shared `pickLibraryOgRotatedIndex(...)`; keep `pickHourlyRotatedIndex` as thin hourly wrapper for existing imports/tests (or update call sites in the same PR — either is fine, no dual logic).

---

## Security Review

**Findings:**
- Staff design updates are not field-allowlisted in rules — additive field is writable; public catalog read already exposes ready design docs (non-sensitive color).
- Critical: compositor must use design-doc hex after server-side normalize; URL `bg` remains cache-bust only.

**Required changes:**
- [x] Do not use query `bg` to paint the JPEG (plan already assumes this — enforce in implement).
- [ ] None beyond that

**Human approval needed before production:**
- [x] None for this phase (dev soft-deploy only)

---

## Data Model Review

**Findings:**
- `libraryOgRotationInterval` default `"hourly"` preserves current behavior.
- Omitting field when default grey keeps sparse docs — good; clearing custom → default must `deleteField()` (or equivalent) so resolve falls back correctly.

**Required changes:**
- [x] When saving design with grey/default selected after a prior custom/light-black value, remove `artworkBackgroundHex` from the document (do not leave stale custom).

---

## Backend Review

**Findings:**
- `parsePortalSocialMetaSettingsInput` must accept/reject interval; missing → default hourly for backward compatibility.
- `buildPortalOgShareImageFunctionUrl` needs `bg` param from resolved design color (global library pick uses that design’s color).

**Required changes:**
- [x] Soft-deploy all touched Functions listed in plan after automated checks pass.

---

## Testing Review

**Findings:**
- Cover interval edge cases (5min bucket change, salt), hex normalize/reject, compose with non-default bg pixel check (±JPEG tolerance), URL `bg=` reflection.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Update DATA_MODEL `Design` + `portalSocialMeta`; DEPLOYMENT OG section; short DECISIONS entry.

---

## Required Changes (if approved_with_changes)

1. Paint OG letterbox from **design document** hex only; query `bg` is cache-bust / ignored for paint.
2. Clearing to default grey **deletes** `artworkBackgroundHex` when previously set.
3. Soft-deploy touched Functions to fresh-prints-dev after implement + automated tests.
4. Keep Portal in-scope surfaces to catalog card/thumbnail mat, catalog lightbox, and Studio design form + design-library mats that show that design’s artwork — do not expand into Assisted Creation / request mats in this phase.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Scope and security are sound; required changes are implement-time constraints already implied by the plan. **approved_with_changes** allows implementation without re-planning.

---

## Next Step

Implement approved scope (Slice A then Slice B), then automated tests, soft-deploy, manual checkpoint.
