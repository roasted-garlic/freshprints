# Plan: Production Studio Storage unauthorized + bundled brand defaults

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (`production-release` Goal #13) |
| Related | Incident `docs/workflow/reviews/2026-07-31-production-studio-storage-unauthorized-incident.md`; Review `docs/workflow/reviews/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-review.md` |

---

## Goal

1. **Storage incident:** Identify and apply the evidence-backed remediation so production Studio
   can upload catalog originals and brand logos again, unblocking Stage 1 catalog fixtures and
   Stage 2 smoke.
2. **Bundled branding (separate scope):** Replace Studio/Portal bundled default logos, Portal
   favicon set, and Studio packaged app icon with owner-supplied assets, preserving runtime
   `settings/brandLogos` overrides.

Do **not** implement either workstream in the diagnosis pass. Stop for Formal Review and the
required human checkpoints below.

---

## Background

Stage 1 catalog fixture creation is blocked: design import and Brand Logos Settings both fail with
`storage/unauthorized`. Diagnosis (incident doc) ruled out wrong bucket, wrong packaged project,
live Rules drift, App Check enforcement, and CORS. Live Rules are byte-identical to repo
`storage.rules`. Brand “read” error is a failed `uploadBytes` to a new UUID path; production has
no `settings/brandLogos` doc and zero `brand/` objects.

Separately, the owner will supply new default branding assets. Runtime upload architecture
(ADR-FP-114) must remain intact; Storage failures must not remove bundled fallbacks.

---

## Scope

### In Scope

#### Storage remediation (after diagnostic gate)

- Owner Console Rules Playground + Studio DevTools Network evidence (read-only)
- Evidence-selected remediation only (see §Remediation classes)
- Docs / workflow updates; owner retest of design import + brand upload

#### Bundled brand defaults (Plan + asset mapping only this pass)

- Inventory of bundled logo/favicon/app-icon consumers
- Exact owner asset map and technical requirements
- Preserve runtime override + Clear → new bundled default
- Future implementation after `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION`

### Out of Scope (this pass and unless separately approved)

- Deploying identical Storage Rules “just in case”
- Custom domain / DNS / Authorized Domains / OAuth
- App Hosting rollout (until branding implementation + release approval)
- Studio rebuild (until Storage fix and/or branding implementation approval)
- GA4 / Search Console / `v1.0.0` tag / master deletion
- Coming Soon, email logos, splash redesign, new PWA feature
- Deleting production Storage objects or repairing brand metadata (none exist)
- Committing pre-existing dirty working-tree PNG/source edits without approval

---

## Part A — Storage incident

### Exact root cause (current)

**Confirmed:** authenticated Storage **creates** denied on production for Studio owner uploads
(`originals/**`, `brand/**`) despite correct packaged config and live Rules matching source.

**Unresolved mechanism (must close before choosing fix):** Rules `firestore.get(users/{uid})`
evaluation failure vs missing Auth on Storage requests vs brand-only &gt;2 MB upload.

### Remediation classes (select exactly one after diagnostic gate)

| Class | When | Changes |
|-------|------|---------|
| **A — Claims/Rules evaluation fix** | Playground DENIES owner create with known owner UID | Likely Storage Rules and/or Auth custom claims / user-doc shape so `isStaff`/`isOwner` succeed; may require Functions to set claims |
| **B — Studio Auth→Storage client fix** | Playground ALLOWS; Network shows upload without Auth / 403 from rules despite signed-in UI | Studio renderer fix (token refresh / upload gating); **new Studio installer** |
| **C — Brand size-only** | Design import works after A/B; brand still fails and file &gt;2 MB | Owner supplies ≤2 MB PNG; no Rules change unless product raises limit (separate decision) |
| **D — Other evidence-backed** | New proven cause | Document and re-review |

**Explicitly rejected without new evidence:** redeploying identical `storage.rules`; App Check
changes; bucket renames; CORS reapplication; snapshot rebuild.

### Diagnostic gate (required before implementation)

Owner (or agent with Console access under approval) must record:

1. Firebase Console → Storage → Rules → Playground:
   - Authenticated as production owner UID
   - `create` on `originals/{testId}.png` with `image/png` size 1024
   - `create` on `brand/studio/full/{uuid}.png` with `image/png` size 1024
   - Result ALLOW/DENY + any evaluation debug
2. Production Studio DevTools Network on one failed design upload:
   - Request host/path
   - Whether `Authorization: Bearer` (Firebase ID token) is present (**do not paste token**)
   - Response status / Firebase error payload summary
3. Optional: Auth → Users → confirm UID matches `users/{uid}`

### Files / settings that may change (after class selection)

| Class | Likely touch points |
|-------|---------------------|
| A | `storage.rules` and/or Functions claims writer; possibly `users/{uid}` fields; **Storage Rules deploy** |
| B | Studio upload services / auth bootstrap; **Studio rebuild/installer** |
| C | None in repo (owner asset) |

### Rebuild / deploy flags

| Action | Required? |
|--------|-----------|
| Studio rebuild | **Only if class B** (or shared with branding release after B) |
| Storage Rules deploy | **Only if class A changes rules** |
| App Check change | **No** (ruled out) |
| App Hosting rollout | **No** for Storage-only fix |

### Rollback

| Class | Rollback |
|-------|----------|
| A | Redeploy prior ruleset / remove claims writer; keep prior installer |
| B | Reinstall prior `v1.0.0-rc5` installer |
| C | N/A |

### Automated verification (future implement)

- Rules unit tests if Rules change
- Studio typecheck/lint for client fix
- No production deploy without approval phrase below

### Owner manual QA (after fix)

1. Sign in production Studio as owner
2. Import a small/owner-approved PNG (&lt;150 MB) — expect upload success past Storage step
3. Brand Logos → upload Studio full PNG ≤2 MB — expect success; Clear restores bundled default
4. Confirm no Test Data Reset / Catalog Storage Inventory / Firebase Debug UI regressions

### Production approval phrases

| Step | Phrase |
|------|--------|
| Run diagnostic gate only | `APPROVE PRODUCTION STORAGE WRITE DIAGNOSTIC` |
| After class A selected | `APPROVE PRODUCTION STORAGE RULES/CLAIMS REMEDIATION` |
| After class B selected | `APPROVE PRODUCTION STUDIO STORAGE AUTH FIX REBUILD` |
| Combined Studio rebuild with branding (only if Formal Review allows) | Must list exact contents; do not use a blanket phrase |

---

## Part B — Bundled brand asset replacement

### Architecture distinction (mandatory)

| Layer | Mechanism | Behavior |
|-------|-----------|----------|
| Runtime override | `settings/brandLogos` + Storage `brand/**` + `finalizeBrandLogoSlot` | When HTTPS `downloadUrl` present → use it |
| Bundled default | Repo static PNGs / favicons / app icons | When unset, cleared, offline, or non-HTTPS → use bundled |
| Storage auth failure | Upload fails in Settings | Must **not** remove bundled fallback in shell/login; today shell already uses bundled when settings doc absent |

**Current gap:** `AppLogo` / `PortalLogo` have **no `<img onError>`** fallback if a stored
`downloadUrl` returns 403/404 — broken image possible after a future successful metadata write
pointing at a bad object. Implementation should add fail-closed restore to bundled default without
redesigning upload architecture.

### Inventory (verified)

#### Studio logos

| Logical slot | Path | Consumers |
|--------------|------|-----------|
| Studio full | `apps/studio/src/assets/brand/fresh-prints-studio-logo.png` | `AppLogo.tsx`, `LoginPage.tsx`, `BrandLogoSettingsSection.tsx` fallback |
| Studio collapsed | `apps/studio/src/assets/brand/fresh-prints-studio-logo-collapsed.png` | `AppLogo` collapsed; Settings card; **app-icon generator source** |

Measured (working tree may already contain owner-local edits — **not committed this pass**):

| File | WxH | Format | Alpha | Bytes |
|------|-----|--------|-------|-------|
| Studio full | 10800×2851 | PNG | yes | ~1.26 MB |
| Studio collapsed | 5400×5400 | PNG | yes | ~0.97 MB |

#### Portal logos

| Logical slot | Path | Consumers |
|--------------|------|-----------|
| Portal full | `apps/portal/public/brand/fresh-prints-request-portal-logo.png` | `PortalLogo`, auth logo, OG/share fallback via `portalSiteMeta` / brand helpers |
| Portal collapsed | `apps/portal/public/brand/fresh-prints-request-portal-logo-collapsed.png` | `PortalLogo` collapsed |

| File | WxH | Format | Alpha | Bytes |
|------|-----|--------|-------|-------|
| Portal full | 10800×4358 | PNG | yes | ~2.35 MB (**&gt;2 MB runtime upload limit**) |
| Portal collapsed | 6387×6405 | PNG | yes | ~1.86 MB |

Shared aspect constants: `BRAND_LOGO_FULL_ASPECT_RATIO = 10800/4358`,
`BRAND_LOGO_COLLAPSED_ASPECT_RATIO = 1` in
`packages/shared/src/constants/brand/brandLogoSettings.constants.ts`.

#### Portal favicon / manifest (existing — not a new PWA)

| Asset | Path | Referenced by |
|-------|------|---------------|
| favicon.ico | `apps/portal/public/favicon.ico` | `portalSiteMeta.ts` icons |
| favicon.svg | `apps/portal/public/favicon.svg` | same |
| favicon-96x96.png | `apps/portal/public/favicon-96x96.png` | same |
| apple-touch-icon.png | `apps/portal/public/apple-touch-icon.png` | same (180×180) |
| web-app-manifest-192/512 | `apps/portal/public/web-app-manifest-*.png` | `site.webmanifest` |
| Manifest | `apps/portal/public/site.webmanifest` | `portalSiteMeta` `manifest: '/site.webmanifest'` |

#### Studio app icon pipeline

| Output | Path | Notes |
|--------|------|-------|
| Generator | `apps/studio/scripts/generate-app-icon.mjs` | Source = collapsed Studio logo; **8% padding** (`PADDING_RATIO = 0.08`); writes 7-size `.ico` + 512 PNG |
| Packaged Windows icon | `apps/studio/icon.ico` | `electron-builder.json5` `win.icon` |
| Packaged PNG icon | `apps/studio/icon.png` | `linux.icon` |
| Dev BrowserWindow | `apps/studio/public/app-icon.png` (512×512) | `electron/main.ts` |

Splash / Coming Soon / email logos: **out of scope** unless proven to reuse these paths
(`[NEEDS OWNER DECISION]` if coupling discovered later).

### Required owner source files (proposed mapping)

| # | Owner source | Maps to | Generate derivatives? |
|---|--------------|---------|----------------------|
| 1 | Studio full wordmark PNG | Studio full bundled + login | No (direct replace) |
| 2 | Studio collapsed square PNG | Studio collapsed bundled + **app-icon generator input** | Yes → `icon.ico`, `icon.png`, `public/app-icon.png` via existing script |
| 3 | Portal full wordmark PNG | Portal full + OG static fallback | No |
| 4 | Portal collapsed square PNG | Portal collapsed | No |
| 5 | Favicon/app mark (square) | Portal favicon set + manifest icons | Yes → ico/svg/96/apple/192/512 **or** owner supplies each |

**Decisions for owner approval:**

1. **How many sources?** Prefer **5** (table above). Minimum **4** if favicon/app mark may be
   generated from Studio collapsed — **only with explicit owner confirmation** (do not silently
   use wordmark as favicon).
2. Full vs collapsed: **separate** artwork required (different aspect).
3. Studio `.ico` / packaged PNG: generated from **Studio collapsed** via
   `generate-app-icon.mjs` (keep **8% padding** unless owner requests change).
4. Portal favicon sizes: from **favicon/app mark** source (or RealFaviconGenerator-equivalent
   sizes already represented in repo).
5. Manifest icons: **yes**, already part of Portal (`site.webmanifest`).
6. Padding: current generator **adds** 8% padding — **preserve** unless owner says otherwise.
7. Runtime fail fallback: add `onError` → bundled default (implementation phase).
8. Portal asset replace → **requires App Hosting rollout** to affect hosted Portal.
9. Studio asset/icon replace → **requires new Studio installer**.
10. Sharing one Studio rebuild with Storage class B: **allowed if** Formal Review lists exact
    combined contents; Storage class A alone does **not** require Studio rebuild.
11. Sharing one Portal rollout with Storage: Storage fix does not need Portal; branding does.
12. Rollback: restore previous installer; redeploy previous Portal backend release; git revert
    asset commit.

### Asset requirements table

| Logical slot | App | Current path | Format | Dimensions basis | Transparency | Aspect | May generate from | Visual approval |
|--------------|-----|--------------|--------|------------------|--------------|--------|-------------------|-----------------|
| Studio full | Studio | `…/fresh-prints-studio-logo.png` | PNG | Match replacement intent; current tree 10800×2851 | Prefer alpha | Wide wordmark | No | Yes |
| Studio collapsed | Studio | `…/fresh-prints-studio-logo-collapsed.png` | PNG | Current 5400×5400 square | Prefer alpha | ~1:1 | App-icon source | Yes |
| Portal full | Portal | `…/fresh-prints-request-portal-logo.png` | PNG | Current 10800×4358; constants use 10800/4358 | Prefer alpha | Wide | No | Yes |
| Portal collapsed | Portal | `…-collapsed.png` | PNG | Current ~square | Prefer alpha | ~1:1 | No | Yes |
| Portal favicon.ico | Portal | `public/favicon.ico` | ICO | Meta cites 48×48 | n/a | Square | From favicon source | Yes |
| Portal favicon.svg | Portal | `public/favicon.svg` | SVG | — | — | Square | Owner SVG or skip if not provided `[NEEDS OWNER DECISION]` | Yes |
| Portal favicon-96 | Portal | `public/favicon-96x96.png` | PNG | 96×96 | Prefer alpha | 1:1 | From favicon source | Yes |
| Apple touch | Portal | `public/apple-touch-icon.png` | PNG | 180×180 | Often opaque OK | 1:1 | From favicon source | Yes |
| Manifest 192/512 | Portal | `public/web-app-manifest-*.png` | PNG | 192 / 512 maskable | Per current | 1:1 | From favicon source | Yes |
| Studio app icon | Studio | `icon.ico` / `icon.png` / `public/app-icon.png` | ICO/PNG | 16–256 + 512 | Alpha | Square + 8% pad | Studio collapsed | Yes |

Do **not** invent new dimensions beyond current files, meta, electron-builder, and generator.

### Human checkpoints (branding)

1. `APPROVE BRAND ASSET MAPPING` — after reviewing this map / source count
2. Owner supplies files → inspect format/dimensions/alpha; stop on mismatch
3. `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` — before replacing files
4. Separate production release approval for Studio installer and/or Portal rollout

---

## Combined release note

Storage class **B** + branding can share one Studio rebuild **only** when the approval text lists
both scopes. Storage class **A** (Rules/claims) does not require branding. Portal branding always
needs its own App Hosting rollout approval.

---

## Test strategy (future implementation)

### Storage fix

- Playground ALLOW for owner create after fix
- Owner design import PASS
- Owner brand upload ≤2 MB PASS
- Public catalog still loads; Coming Soon untouched

### Branding

- Studio sidebar full/collapsed/login; override + Clear; Storage fail → bundled
- Packaged exe/installer/taskbar icons; asar contains new assets
- Portal header/sidebar/auth/favicon/manifest/OG fallback
- `npm run lint`; Studio typecheck/build/package; Portal typecheck/build; `git diff --check`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Blind Rules redeploy | Forbidden; rules already identical |
| Combining releases without listing contents | Separate approval phrases |
| Favicon from wordmark | Require explicit owner mapping |
| Dirty local PNG edits committed accidentally | Stage docs only until brand implementation approval |
| Portal full &gt;2 MB cannot be re-uploaded via Settings | Bundled path OK; runtime upload still ≤2 MB |

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No (app product assets, not FreshForge starter) |
| Development Tooling | Possible icon script tweak only if padding decision changes |
| Distribution/Installer | Studio installer when rebuild approved |
| Documentation | Yes — workflow artifacts |
| Development History | No |

---

## Open questions / checkpoints

- [ ] Owner completes Storage diagnostic gate → reply with Playground + Network summaries
- [ ] Owner replies `APPROVE BRAND ASSET MAPPING` (or requested mapping changes)
- [ ] Owner provides asset files after mapping approval
- [ ] Do not implement until Formal Review verdict + relevant approval phrases
