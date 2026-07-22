# Plan: Brand logo uploads (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Agent |
| Status | approved (implementation approved 2026-07-22) |
| Workflow | managed-phase (concurrent; isolated branch/worktree) |
| Related | docs/workflow/reviews/2026-07-22-brand-logo-uploads-review.md |

---

## Goal

Let the owner upload **Studio** and **Portal** brand logos (full/wordmark and collapsed/small) from **Studio → Settings**, store them in Firebase Storage, and have both apps resolve the uploaded URLs at runtime—so logos no longer require dropping PNG files into repo folders and redeploying.

## Background

Today logos are static:

| App | Full | Collapsed |
|-----|------|-----------|
| Studio | `apps/studio/src/assets/brand/fresh-prints-studio-logo.png` (Vite import in `AppLogo`) | `…-collapsed.png` |
| Portal | `apps/portal/public/brand/fresh-prints-request-portal-logo.png` (`PortalLogo`) | `…-collapsed.png` |

Portal OG “logo” mode and share fallbacks also hardcode `/brand/fresh-prints-request-portal-logo.png`. Studio Settings already has owner-only settings patterns (`settings/portalSocialMeta` + callable). There is **no** Storage brand prefix and **no** settings UI for logos.

### Concurrent work (mandatory)

- **`firestore-usage-efficiency` continues concurrently.** It must **not** be paused, replaced, reset, or marked for later resumption because of this goal.
- Brand-logo implementation must stay on an **isolated git branch and/or worktree** and must **not** overwrite:
  - `.cursor/workflow/state.md` (owned by the Firestore efficiency workflow while that goal is active)
  - `CURRENT-STATE` / handoff files belonging to that workflow
  - That workflow’s implementation records, test reports, or signoff status
- Brand-logo workflow status lives in **this plan and its review** (and optional branch-local notes)—not by taking over the shared workspace state file.
- **Before merge:** diff against the Firestore efficiency branch and resolve conflicts in shared surfaces, including at least:
  - Functions exports / `functions/src/index` (or equivalent)
  - `firestore.rules`, `storage.rules`
  - Shared docs (`DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md`, `DECISIONS.md`, etc.)
  - Shared constants / packages
  - `.cursor/workflow/state.md` (merge carefully; prefer keeping Firestore efficiency as active goal until that phase signs off)

## Scope

### In Scope

- Studio Settings tab **Brand logos** (owner-only): upload/replace preview for four slots:
  1. Studio full
  2. Studio collapsed
  3. Portal full
  4. Portal collapsed
- Persist metadata in Firestore `settings/brandLogos` (paths, download URLs, audit fields).
- Persist files in Firebase Storage under `brand/{studio\|portal}/{full\|collapsed}/…`.
- Runtime consumers:
  - Studio `AppLogo` — prefer uploaded URL; fall back to bundled assets (offline-safe).
  - Portal `PortalLogo` — prefer uploaded URL; fall back to `/public/brand/…` static assets.
  - Portal OG / share logo fallback — prefer absolute uploaded Portal full URL when set; else existing static path.
- Validation: image MIME (`image/png` required for v1), max size (2 MiB), owner-only write.
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md` (OG logo note), `DECISIONS.md` ADR if needed.
- Tests for shared parse/resolve helpers + storage-rules alignment constants if the project pattern exists.
- Keep existing static PNGs in repo as **defaults / fallbacks** (do not delete).

### Out of Scope

- Favicons / web app manifest icons (separate RealFaviconGenerator set).
- Splash / coming-soon / maintenance site logos (`splash/**`).
- SVG or multi-format upload (PNG only in v1).
- Automatic image resize/crop in the browser (owner supplies correctly sized assets).
- Non-owner staff editing logos.
- Production Storage/Firestore rules deploy without human approval (plan + implement locally; deploy is a checkpoint).
- Changing social-sharing title/description (existing Social sharing tab).
- Pausing or altering `firestore-usage-efficiency` work.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/brand/` (new) — doc id, slot enums, parse/resolve, size/MIME limits
- `firestore.rules` — `settings/brandLogos` read/write
- `storage.rules` — `brand/{app}/{slot}/{fileName}`
- `functions/src/updateBrandLogoSettings.ts` (or per-slot upload finalize callable) — owner-only metadata write; Admin cleanup of prior object; **authoritative Storage metadata**
- `apps/studio/.../settings/` — section, hook, service; `SettingsPage` tab
- `apps/studio/.../shared/components/AppLogo.tsx` + small brand-logo context/hook
- `apps/portal/features/brand/` — `PortalLogo`, optional brand logos service/hook; OG helpers (`portalSiteMeta.ts`, share meta)
- `functions/src/getPortalGlobalOpenGraph.ts` (and related) — return absolute Portal full logo URL when `globalOgImageSource === "logo"` and settings has URL
- Docs listed above

### Architecture Impact

- [x] Details: New settings doc + Storage prefix; Studio/Portal UI resolve brand URLs via services/hooks (no direct Storage calls from leaf presentational components beyond `src=`). Upload orchestration in Studio settings service layer. Matches existing Settings + Storage layering. Concurrent with Firestore efficiency; isolate branch/worktree.

### Security Impact

- [x] Details:
  - **Owner-only** upload and Firestore metadata writes (callable and/or Storage rules `isOwner()`).
  - Firestore client writes remain **denied**; metadata via Admin callable (mirror `portalSocialMeta`).
  - Storage: **public read** on `brand/**` (logos appear on Portal guest/auth pages and OG crawlers). Write create/update/delete: owner only with MIME/size checks; catch-all deny unchanged.
  - Firestore `settings/brandLogos`: **public read** (URLs only; no secrets) so Portal guests and Studio can subscribe without a new public Function. Writes: false (callable).
  - Validate MIME, size, slot/app enums server-side (callable) and in Storage rules.
  - **Finalize callable must not trust client-provided `contentType`, `byteSize`, or download URL.** Obtain those from authoritative Admin Storage metadata (and/or server-built download URL). Client may send only `{ app, slot, storagePath }` (plus clear action); server verifies path binding, reads metadata, validates PNG + size ≤ 2 MiB, then writes Firestore.
  - Do not log file bytes; no secrets.

### Data Model Impact

- [x] Details: New doc `settings/brandLogos`:

```ts
interface BrandLogoSlot {
  storagePath: string;      // e.g. brand/portal/full/{objectId}.png
  downloadUrl: string;      // HTTPS URL from server (Admin / Storage), not client-claimed
  contentType: "image/png"; // from Storage metadata
  byteSize: number;         // from Storage metadata
  updatedAt: Timestamp;
  updatedBy: string;
}

interface BrandLogoSettings {
  studioFull?: BrandLogoSlot | null;
  studioCollapsed?: BrandLogoSlot | null;
  portalFull?: BrandLogoSlot | null;
  portalCollapsed?: BrandLogoSlot | null;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Missing slots → consumers use bundled/static defaults. No migration/backfill required.

### Backend Impact

- [x] Details:
  - Callable `updateBrandLogoSlot` / finalize (name TBD): owner-only; after client `uploadBytes` to a new object path.
  - Preferred upload flow:
    1. Owner selects PNG in Settings UI.
    2. Client validates type/size (UX only; not security boundary).
    3. Client uploads to `brand/{app}/{slot}/{uuid}.png` (owner Storage create).
    4. Client calls finalize with **`{ app, slot, storagePath }` only** (or clear: `{ app, slot, clear: true }`).
    5. Callable: verify owner; verify `storagePath` matches shared builder for claimed `app`+`slot`; Admin `getMetadata` (or equivalent) for **contentType** and **byteSize**; reject if not `image/png` or size > 2 MiB; obtain usable **download URL via Admin/server** (do not accept client `downloadUrl`); merge Firestore slot; Admin-delete prior object if any.
  - Storage + Firestore rules updates; Functions export wiring (merge carefully with concurrent Firestore efficiency branch).
  - OG Function reads `settings/brandLogos.portalFull.downloadUrl` when logo mode.

### UI / UX Impact

- [x] Details:
  - New Settings tab **Brand logos** (owner), near Social sharing.
  - Four cards: current preview, file picker, Replace / Clear (clear = remove slot → fallback to bundled default; delete Storage object).
  - Manual UI checkpoint required (Studio + Portal visual).

### Migration Impact

- [x] None (additive). Forward: deploy rules + Functions, then use UI. Rollback: redeploy prior rules/Functions; leave orphaned Storage objects harmless; apps fall back to static assets if doc cleared or missing.

---

## Approach

1. **Shared constants** — slots, path builders, MIME/size limits, `resolveBrandLogoUrl(settings, slot, fallback)`.
2. **Rules** — Storage `brand/{app}/{slot}/{fileName}` public read / owner write with validation; Firestore `settings/brandLogos` public read / write false.
3. **Callable** — finalize (and clear) brand logo slot; owner-only; **authoritative Storage metadata + server download URL**; Admin delete of replaced/cleared objects.
4. **Studio Settings UI** — Brand logos tab + upload/clear flows.
5. **Studio AppLogo** — resolve via hook/service; use URL when present; keep Vite imports as fallback.
6. **Portal PortalLogo** — subscribe or one-shot fetch of public `settings/brandLogos`; use URL when present; keep `/brand/…` fallbacks.
7. **OG / share** — when logo source or fallback needs Portal full logo, prefer `portalFull.downloadUrl` absolute HTTPS.
8. **Docs + tests** — constants tests; rules alignment test if pattern exists; update DATA_MODEL / BACKEND / DEPLOYMENT / DECISIONS.
9. **Isolation** — implement on isolated branch/worktree; do not overwrite Firestore efficiency workflow state.
10. **Merge gate** — before merging, conflict-check Functions exports, rules, docs, shared constants, and workflow state.
11. **Human** — local manual UI pass; **production** rules + Functions deploy remains a **separate** checkpoint.

### Assumptions

- Splash and favicons stay out of scope.
- PNG only, max 2 MiB per file.
- Public read of logo files and of `settings/brandLogos` is acceptable (brand assets are public by nature).
- Static repo PNGs remain as permanent fallbacks.
- `firestore-usage-efficiency` remains active concurrently (not paused by this work).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared brand helpers) | `npx tsx --test packages/shared/src/constants/brand/**/*.test.ts` | yes |
| Unit (rules alignment if added) | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts` (extend) | yes if file touched |
| Typecheck / lint | project scripts for touched packages | yes if available |
| Functions unit (callable parse / metadata trust rules) | `npx tsx --test functions/src/**/brand*.test.ts` | yes if added |
| Build | not required for full monorepo unless cheap | no |
| E2E | no | no |
| Emulator rules tests | if existing harness covers new paths | preferred |

### Manual

- [x] Details: Studio Settings upload each of 4 logos; verify sidebar/login. Portal guest + auth pages show new logos; collapsed sidebar mark. Clear restores defaults. OG logo mode uses new Portal full URL when deployed (optional if Functions not yet deployed — document).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Studio + Portal logos)
- [ ] Design approval (not required if owner supplies assets)
- [x] Production deploy — Storage rules, Firestore rules, Functions (**separate** from implementation approval)
- [ ] Database migration — none
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none
- [x] Other: public read on brand Storage + `settings/brandLogos` (accepted with implementation approval)
- [x] Other: pre-merge conflict check vs concurrent Firestore efficiency branch

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Public Storage abuse (write) | high | Owner-only write; path/MIME/size rules; default deny elsewhere |
| Client-forged metadata / URL | high | Finalize uses Admin Storage metadata + server download URL only |
| Merge conflicts with Firestore efficiency | medium | Isolated branch; pre-merge checklist on shared files |
| Broken logo if URL revoked | medium | Keep static fallbacks; Clear restores defaults |
| Studio offline / cold start | medium | Bundled Vite assets always available as fallback |
| Facebook OG cache | low | Same as social meta; Debugger scrape; absolute HTTPS URL |
| Orphan Storage objects | low | Callable deletes prior object on replace/clear |
| Scope creep into favicons/splash | medium | Explicit out of scope |
| Rules deploy without testing | high | Human checkpoint before production rules deploy |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Clear `settings/brandLogos` slots (or delete doc) → apps use static defaults.
2. Redeploy previous Functions / rules if needed.
3. Orphan `brand/**` objects can remain or be deleted manually; not referenced.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md (brief Storage brand prefix note if useful)
- [x] DATA_MODEL.md — `settings/brandLogos`
- [x] BACKEND.md — Storage path + callable
- [ ] TESTING.md (only if new command patterns)
- [x] DEPLOYMENT.md — OG logo can be Storage URL
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — short ADR (public brand assets + owner upload)
- [ ] Other: workflow test report / signoff (brand-logo only; do not rewrite Firestore efficiency signoff)

---

## Open Questions

- [x] Splash / favicons: **out of scope**.
- [x] Public read of brand assets + settings doc: **yes**.
- [x] Concurrent with `firestore-usage-efficiency`: **yes** (isolated branch/worktree; no shared-state takeover).
- [ ] None blocking.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-brand-logo-uploads-review.md
- Review verdict: **approved** (amendments incorporated 2026-07-22)
- **Implementation: approved** by owner 2026-07-22 (subject to plan/review amendments above)
- **Production** deploy of Functions, Firestore rules, and Storage rules: **not** approved here — separate human checkpoint
