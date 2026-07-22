# Plan: Portal OG letterbox + global image source toggles

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-20-portal-first-load-tab-spinner-findings.md; #11 OG signoff |

---

## Goal

Make Facebook/Messenger (and other) link previews show **full design artwork** when desired, by optionally letterboxing designs onto a 1200×630 Open Graph canvas. Fix non-design Portal URLs so they reliably use a **daily-rotated ready-library image** instead of always falling back to the brand logo. Expose both behaviors as **Studio → Settings → Social sharing** toggles so the owner can A/B test logo vs library and letterbox vs crop without a deploy.

## Background

- Design share OG (`/share/design/{id}`) already returns correct title/description/`og:image` via public Function `getPortalDesignShareOpenGraph`. Facebook then **center-crops** non-1.91:1 art into its wide preview frame — heads/tops get cut off.
- Non-design URLs (`/`, `/login`, etc.) are supposed to use a daily-rotated ready-library image (`portalGlobalSocialMetaService` + `pickDailyRotatedIndex`). In practice crawlers see the **logo**: global meta still depends on Portal Admin Firestore/Storage, with a **1.5s budget** that often loses to the 40-design query + signed URL; local/ADC gaps were previously mitigated by skipping Admin entirely. Design shares already have a Function escape hatch; global meta does not (called out in first-load findings).
- Owner wants Studio toggles to test letterboxed “poster with margins” vs raw crop, and logo vs rotating library image.

**Chosen approach (best results):** on-demand **Cloud Function image compositor** using existing `sharp` in `functions/` — serve a public HTTPS `og:image` URL that returns a 1200×630 JPEG/PNG with the design `contain`-fitted on a neutral background. Prefer Function JSON + image URLs for **global** meta (mirror share path) so crawlers never depend on Portal Admin ADC/budget.

---

## Scope

### In Scope

- Extend `settings/portalSocialMeta` with:
  - `letterboxOgImages: boolean` (default **`true`** — full art in 1.91:1 frame)
  - `globalOgImageSource: "library" | "logo"` (default **`"library"`**)
- Studio Social sharing UI: two toggles + updated help copy; save via existing owner callable.
- Public Functions:
  - `getPortalOgShareImage` — GET returns composed or passthrough design image for a ready design (`designId`, optional `fit` cache-buster from settings).
  - `getPortalGlobalOpenGraph` — GET JSON `{ ogTitle, ogDescription, imageUrl }` (settings + daily rotation or logo), for Portal `generateMetadata` without Admin.
- Portal: prefer Function for global social meta (like design share); use compositor URL as `og:image` when letterbox is on for design shares and library global images.
- Unit tests for settings parse/resolve, rotation/compositor helpers where pure.
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md` (OG section).
- Soft-deploy Functions to **fresh-prints-dev** after implement (human approval for any production).

### Out of Scope

- Facebook `fb:app_id` (owner deferred).
- Pre-generating OG assets into Storage for every design.
- Changing WhatsApp/Twitter card type beyond existing `summary_large_image`.
- Production App Hosting / Functions deploy (dev soft-deploy only unless owner asks).
- Random-per-request rotation (keep **daily** stable rotation for cache friendliness).

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/portal/portalSocialMetaSettings.constants.ts` (+ tests)
- `functions/src/updatePortalSocialMetaSettings.ts`
- `functions/src/getPortalDesignShareOpenGraph.ts` (emit letterbox image URL when enabled, or keep JSON imageUrl pointing at compositor)
- `functions/src/getPortalGlobalOpenGraph.ts` (**new**)
- `functions/src/getPortalOgShareImage.ts` (**new** — sharp letterbox / optional redirect to signed raw)
- `functions/src/lib/portalOgImageCompose.ts` (**new** helper)
- `functions/src/index.ts` exports
- `apps/portal/features/brand/portalGlobalSocialMetaService.ts`
- `apps/portal/features/catalog/services/portalDesignShareMetaService.ts`
- `apps/studio/.../PortalSocialMetaSettingsSection.tsx` + hook/service types
- Docs listed above

### Architecture Impact

- [x] Details: Portal metadata continues to call services only; new public HTTPS Functions for crawler-facing OG JSON/image. Composition stays in Functions (sharp already used). Settings remain in shared constants.

### Security Impact

- [x] Details: New public GET endpoints — **ready designs only**; validate `designId`; no auth required (same posture as `getPortalDesignShareOpenGraph`). Do not leak non-ready designs. Rate/cache via Cache-Control. Owner-only write path unchanged for settings. No new secrets.

### Data Model Impact

- [x] Details: Additive fields on `settings/portalSocialMeta`. Missing fields resolve to defaults (`letterboxOgImages: true`, `globalOgImageSource: "library"`). No migration job.

### Backend Impact

- [x] Details: New Functions + extended callable parse. Soft-deploy to `fresh-prints-dev`. Image Function may need memory bump if large previews (start with default; raise if needed).

### UI / UX Impact

- [x] Details: Studio Settings → Social sharing: toggles for letterbox and global image source. Manual Facebook Debugger checkpoint required.

### Migration Impact

- [x] Forward steps: Deploy Functions; existing settings docs without new fields keep working via resolve defaults.
- [x] Rollback / compatibility: Redeploy prior Functions; toggles ignored if old Portal still live; remove fields optional.

---

## Approach

1. **Shared settings**
   - Add booleans/enums to `PortalSocialMetaSettings`, defaults, `resolve*`, `parse*` (accept toggles with title/description).
   - Extend unit tests.

2. **Compositor (sharp)**
   - Canvas **1200×630**; background = Portal/Studio `--color-artwork-preview-bg` light theme **`#e5e7eb`** (same as catalog/design preview mats; not pink/cyan logo bars). Owner feedback 2026-07-21 superseded earlier `#111111` draft.
   - Fit design with `contain` + center; output JPEG quality ~85 (smaller for crawlers) or PNG if transparency matters for margins (JPEG preferred for FB).
   - When letterbox **off**: image URL is existing signed preview/thumbnail (current behavior).
   - When letterbox **on**: `og:image` = public Function URL  
     `…/getPortalOgShareImage?designId=…&fit=contain`  
     (include `fit` so Facebook cache separates modes).

3. **Global OG Function**
   - Read settings; if `globalOgImageSource === "logo"` → `imageUrl: null` (Portal uses static brand path).
   - Else pick daily index from newest N ready designs; return letterboxed Function URL or signed raw per `letterboxOgImages`.
   - Portal `loadPortalGlobalSocialMeta` prefers this Function (no Admin budget race); Admin remains optional fast path only if already available and Function fails.

4. **Design share**
   - `getPortalDesignShareOpenGraph` (and Portal builder) set `imageUrl` to compositor URL when letterbox on.

5. **Studio UI**
   - Checkboxes/toggles:
     - “Letterbox share images (show full design in preview)”
     - “Global preview image: Library (daily rotate) | Brand logo”
   - Persist via `updatePortalSocialMetaSettings`.

6. **Verify**
   - Unit tests; Functions soft-deploy; curl home + share HTML for `og:image`; Facebook Debugger scrape (manual).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared settings) | `cd packages/shared && npx tsx --test src/constants/portal/portalSocialMetaSettings.constants.test.ts` | yes |
| Unit (compose helper / pick index if touched) | functions + portal brand tests as applicable | yes |
| Typecheck / lint (touched packages) | project scripts for portal/shared/functions | yes if scripts exist |
| Build | Portal build only if low-cost; else document skip | optional |
| Integration | none | no |
| E2E | none | no |
| Backend/rules | callable already owner-gated; no rules change unless settings client read widens (owners only — no change) | no |

### Manual

- [x] Studio: toggle letterbox on/off → save → Scrape Again on a design share URL → confirm full art vs crop.
- [x] Studio: global source library vs logo → scrape `https://myprintrequest.dev/` → library design vs logo.
- [x] Confirm title/description still from settings for home.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Facebook Debugger + Studio toggles)
- [ ] Design approval — N/A (functional toggles)
- [ ] Business logic decision — N/A (defaults chosen: letterbox on, library on)
- [ ] Production deploy — not in this phase
- [ ] Database migration — additive only
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none
- [x] Other: Functions soft-deploy to **fresh-prints-dev** (owner may run or approve agent deploy)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Facebook caches old `og:image` after toggle | med | Distinct query (`fit=contain` vs raw URL); owner Scrape Again |
| Compositor cold start / large PNG | med | JPEG out; Cache-Control; lazy sharp require pattern |
| Public image endpoint abuse | low | Ready-only; validate id; short cache; same class as existing public OG Function |
| Admin budget still used somehow | low | Prefer Function first for global meta |
| Scope creep (pre-generate all OG) | med | Explicit out of scope |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Redeploy previous Function set; Portal falls back to brand logo / raw signed URLs. Settings extra fields harmless. Toggle Studio UI reverts with code rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — `portalSocialMeta` fields
- [x] BACKEND.md — new Functions
- [ ] TESTING.md — only if new scripts
- [x] DEPLOYMENT.md — OG section + verify curls
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md — optional short note if letterbox default is product decision
- [x] Other: plan/review/test/signoff artifacts

---

## Open Questions

- [x] None blocking — defaults: letterbox **on**, global source **library**. Background for letterbox canvas: **`#e5e7eb`** (`--color-artwork-preview-bg` light theme; owner feedback 2026-07-21 — dark `#111111` hid dark designs). Library rotation stays **daily UTC**; Studio **Pick next library preview** bumps `libraryOgRotationSalt` for testing (Scrape Again alone does not change the design).

---

## Addendum (2026-07-21) — Non-root Debugger “never shared”

Owner saw empty Debugger for `/requests/artwork?returnTo=…`. Investigation
(`docs/workflow/reviews/2026-07-21-portal-og-non-root-debugger-findings.md`):

- Tags are present (HTTP 200); message is unscaped URL, not missing OG.
- Narrow code fix: stop hard-coding root `og:url` to site origin so deep links get the request path.
- Library rotation still needs Function soft-deploy (`getPortalGlobalOpenGraph` was 404 → logo fallback).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-review.md
- Verdict: approved_with_changes
