# Plan: Library OG rotation interval + per-design artwork backgrounds

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-21-portal-og-letterbox-and-global-image-toggles-plan.md; owner decisions 2026-07-21 |

---

## Goal

1. Make Studio **Social sharing** library OG rotation configurable via a dropdown: **daily**, **hourly**, **5 minutes**, **1 minute**, or **30 seconds** (keep **Pick next library preview** salt bump). Replace the hard-coded hourly picker. **Do not** add an “each share” mode — Facebook/WhatsApp/Messenger cache OG by page URL; per-share rotation is not practically possible.
2. Add **per-design artwork backgrounds** as the main product change: default Portal/Studio preview grey (`#e5e7eb` / `--color-artwork-preview-bg`), plus a light-black preset (`#2C2D2D`), plus optional custom hex. That color drives Studio + Portal design display mats and **OG letterbox** margins when letterbox is on (fallback grey when unset).

## Background

- Prior phase shipped letterbox compositor + global toggles; letterbox canvas and URL cache-bust use fixed `#e5e7eb`. Library rotation was moved from daily → hourly with salt bump for testing.
- Owner now wants rotation interval as a setting (not too many options) and pivots the deferred “per-design backgrounds” idea into this phase’s primary goal.
- Previous phase manual Facebook Debugger checkpoint remains parked; this phase supersedes further work on that goal. No `fb:app_id`. No production deploy unless owner asks.

## Scope

### In Scope

#### Slice A — Library OG rotation interval (small, first)
- Add `libraryOgRotationInterval: "daily" | "hourly" | "5min" | "1min" | "30s"` on `settings/portalSocialMeta` (default **`hourly`** to match current live behavior).
- Shared picker: generalize `pickHourlyRotatedIndex` → interval-aware helper (or thin wrappers) used by Functions + any Portal re-exports/tests.
- Studio Social sharing: `<Select>` for interval; keep **Pick next library preview**; help copy must note social apps cache previews so “every share” is unavailable — use short intervals or Pick next.
- Explicitly **out of product options**: rotate-on-each-share / random-per-request (owner Q&A 2026-07-21).
- Wire through `parse` / `resolve` / `updatePortalSocialMetaSettings` / Studio hook+service.
- Unit tests for interval math + settings parse/resolve.

#### Slice B — Per-design artwork backgrounds (main)
- Additive optional field on `designs/{id}`: `artworkBackgroundHex?: string` — normalized `#rrggbb` (lowercase), validated.
- Shared constants/helpers: default `#e5e7eb`, preset `#2c2d2d`, `resolveArtworkBackgroundHex(value)` → always returns a safe CSS hex (default when missing/invalid).
- Studio Design edit form: preset buttons (Grey / Light black) + optional custom hex input; persist via existing `updateDesign` path.
- Studio design library / preview mats that show the design’s artwork: apply resolved per-design bg (inline style or CSS variable on the mat), fallback to theme `--color-artwork-preview-bg`.
- Portal catalog surfaces (in scope):
  - `CatalogSelectionCard` / thumbnail panel mats
  - `CatalogPreviewLightbox` image mat
  - Any catalog detail preview that uses artwork-preview-bg for **that design**
- Portal: map field through catalog service → `CatalogDesign`.
- Functions:
  - `composePortalOgLetterboxImage(input, backgroundHex)` — use design color (validated) instead of hard-coded grey.
  - `getPortalOgShareImage` reads design `artworkBackgroundHex`, composes with it.
  - `buildPortalOgShareImageFunctionUrl` includes **actual** `bg` hex (no `#`) for cache-bust; callers that know the design color pass it; `getPortalDesignShareOpenGraph` / `getPortalGlobalOpenGraph` include design’s resolved hex.
- Docs: `DATA_MODEL.md`, `DEPLOYMENT.md` (OG section), `DECISIONS.md` (short ADR), Studio/Portal copy as needed.
- Soft-deploy touched Functions to **fresh-prints-dev** after implement.

### Out of Scope

- `fb:app_id`.
- Production App Hosting / Functions deploy.
- Changing theme tokens globally (dark-theme `--color-artwork-preview-bg` stays as theme default for unset designs).
- Bulk-editing backgrounds across many designs; AI enrichment of background.
- Assisted Creation / Working request / print-request mats beyond catalog+share-relevant surfaces (may inherit later).
- Pre-generating letterbox JPEGs into Storage.
- Firestore rules rewrite (staff already can update design fields they edit today; field is staff-writable via existing update path — confirm no deny-list).

### Implementation order

1. Slice A (rotation dropdown) end-to-end including tests.
2. Slice B (per-design bg) shared → Studio → Portal → Functions → docs.
3. Soft-deploy Functions → fresh-prints-dev.
4. Manual checkpoint for owner.

One managed-phase goal covers both; slices are ordering only, not separate signoffs.

---

## Affected Areas

### Files / Modules (expected)

**Shared**
- `packages/shared/src/constants/portal/portalSocialMetaSettings.constants.ts` (+ tests) — interval type, parse/resolve, generalized rotation picker
- New or extended: `packages/shared/src/constants/.../artworkBackground.constants.ts` (or under designs) — presets, validate/normalize/resolve (+ tests)

**Functions**
- `functions/src/updatePortalSocialMetaSettings.ts`
- `functions/src/getPortalGlobalOpenGraph.ts` — use interval setting
- `functions/src/getPortalDesignShareOpenGraph.ts` — pass design bg into image URL
- `functions/src/getPortalOgShareImage.ts` — read design bg, compose
- `functions/src/lib/portalOgImageCompose.ts` — accept bg param
- `functions/src/lib/portalOgUrls.ts` — `bg` from caller
- Related unit tests

**Studio**
- `PortalSocialMetaSettingsSection.tsx` (+ hook/service if types change)
- `DesignFormFields.tsx`, `designForm.types.ts`, `designFormMapper.ts`, `EditDesignModal.tsx`
- `design.types.ts` (`Design`, `UpdateDesignInput`)
- Design library CSS/components that mat artwork for a known design

**Portal**
- `catalog.types.ts`, `catalogService.ts` mapping
- `CatalogSelectionCard` / `CatalogThumbnailPanel` / `CatalogPreviewLightbox`
- Re-export/tests for rotation if Portal still imports picker (prefer Function-only for crawlers; keep shared helper tests)

**Docs**
- `docs/architecture/DATA_MODEL.md`
- `docs/standards/DEPLOYMENT.md`
- `docs/project/DECISIONS.md`
- Manual checkpoint under `docs/workflow/reviews/`

### Architecture Impact

- [x] Details: Settings + design field remain shared contracts. UI does not call Functions for display bg — Firestore field only. OG composition stays in Functions. No new modules beyond a small shared hex helper.

### Security Impact

- [x] Details: Validate hex strictly (`/^#[0-9a-f]{6}$/` after normalize) in shared + Functions; reject / fallback on invalid. Public `getPortalOgShareImage` still ready-only; do not trust client `bg` query for composition — **read bg from design doc** (query `bg` remains cache-bust only, or optionally ignore for paint). Owner-only settings write unchanged. No new secrets. No production rules relax.

### Data Model Impact

- [x] Details:
  - `settings/portalSocialMeta.libraryOgRotationInterval`: `"daily" | "hourly" | "5min" | "1min" | "30s"`, default `"hourly"`. Missing → hourly.
  - `designs/{id}.artworkBackgroundHex?: string` optional; missing/invalid → `#e5e7eb` at resolve time. No backfill job.

### Backend Impact

- [x] Details: Callable settings update accepts new interval. OG Functions use interval + per-design bg. Soft-deploy to fresh-prints-dev only.

### UI / UX Impact

- [x] Details: Studio Social sharing dropdown + Design form background presets/custom. Portal catalog cards/lightbox mats follow design color. Manual UI + Facebook Debugger scrapes required.

### Migration Impact

- [x] Forward steps: Additive fields only; old clients ignore them; resolvers supply defaults.
- [x] Rollback / compatibility: Remove UI; leave fields; Functions fall back to grey/hourly if code reverted. No destructive migration.

---

## Approach

### Slice A

1. Add `PortalLibraryOgRotationInterval` union + default `"hourly"`.
2. Implement `pickLibraryOgRotatedIndex(sampleSize, nowMs, salt, interval)` with UTC-aligned buckets:
   - `daily` → floor(ms / 86400000)
   - `hourly` → floor(ms / 3600000)
   - `5min` → floor(ms / 300000)
   - `1min` → floor(ms / 60000)
   - `30s` → floor(ms / 30000)
   - Plus salt modulo sampleSize (same as today).
3. Wrap `pickHourlyRotatedIndex` to call hourly path for backward-compatible imports.
4. Studio Select + help text (cache limitation + short intervals / Pick next); save with existing callable.

### Owner addendum (2026-07-21) — no “each share”

**Declined:** Dropdown option that rotates on each Facebook/WhatsApp/Messenger share.

**Why:** Those clients cache Open Graph for a given page URL; sharing does not re-fetch a new random `og:image`. Random-per-request would also make the image URL unstable and fight crawler caches. Do not ship a fake “each share” mode.

**Fallback shipped:** short timers (`1min`, `30s`) plus existing **Pick next library preview** salt bump.

### Slice B

1. Shared presets:
   - `ARTWORK_BACKGROUND_PRESET_GREY = "#e5e7eb"`
   - `ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK = "#2c2d2d"`
2. `normalizeArtworkBackgroundHex(input): string | null` — trim, add `#`, lowercase, validate.
3. `resolveArtworkBackgroundHex(input): string` — normalize or default grey.
4. Studio form: radio/segmented presets; “Custom” reveals text input; save normalized hex or omit field when grey default (prefer **persist grey explicitly only if user selected it after custom**, or always omit when equal to default — choose **omit/delete field when default grey** to keep docs sparse; custom and light-black persisted).
5. Portal: `style={{ backgroundColor: resolve... }}` on mat containers; keep CSS class for layout.
6. Functions compose: parse design field → RGB; URL builder takes `bgHexNoHash` from resolved design color so FB cache keys change when bg changes.

### Soft-deploy

After implement + automated tests: soft-deploy at least `updatePortalSocialMetaSettings`, `getPortalGlobalOpenGraph`, `getPortalDesignShareOpenGraph`, `getPortalOgShareImage` → **fresh-prints-dev**.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit — shared settings + rotation + hex | `npx tsx --test packages/shared/src/constants/portal/*.test.ts` (+ new artwork bg tests) | yes |
| Unit — Functions OG URL/compose | `npx tsx --test functions/src/lib/portalOg*.test.ts` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint (touched scope) | `npm run lint` | yes if TS/TSX changed |
| Full Portal/Studio build | per TESTING.md | optional unless typecheck insufficient |

### Manual

- [x] Details: See Human Checkpoints — Studio interval + Pick next; Design bg presets/custom; Portal catalog mat color; Facebook Debugger design share letterbox margins match design bg; `og:image` URL `bg=` matches.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Studio + Portal mats)
- [x] Other: Facebook Sharing Debugger scrapes (design share + optional home library)
- [ ] Production deploy — **not** in this phase
- [ ] Design approval — owner visual PASS on presets
- [ ] Secrets / env vars — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Invalid custom hex breaks CSS/OG | Medium | Shared normalize; Functions ignore bad values → grey |
| FB still shows old letterbox color | Medium | `bg=` cache-bust uses actual hex; owner Scrape Again |
| 5-minute rotation hurts FB cache friendliness | Low | Owner choice; document in help copy |
| Scope creep into all Portal mats | Medium | Explicit in-scope list: catalog card, lightbox, share-relevant; defer AC/request mats |
| Previous phase manual checkpoint unfinished | Low | Park prior goal; this phase owns new behavior |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert commits / redeploy prior Function versions on fresh-prints-dev. Additive Firestore fields can remain unused. No production change in this phase.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — `artworkBackgroundHex`; `libraryOgRotationInterval`
- [x] DEPLOYMENT.md — OG rotation intervals + per-design letterbox bg
- [x] DECISIONS.md — short ADR (interval options; per-design bg drives display + OG)
- [ ] PROJECT_BRIEF.md — no
- [ ] ARCHITECTURE.md — only if layering changes (unlikely)
- [ ] BACKEND.md — if Functions list needs field notes
- [ ] TESTING.md — only if new commands
- [ ] Other: manual checkpoint review doc

---

## Open Questions

- [x] None blocking — owner decided interval options and presets in this request.
- Assumed: default interval remains **hourly** (current behavior). Assumed: unset design bg → `#e5e7eb`. Assumed: light black `#2C2D2D` stored normalized `#2c2d2d`. Assumed: query `bg` is cache-bust only; paint from design doc.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-review.md
- Verdict: approved_with_changes
