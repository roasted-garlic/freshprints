# Review: Portal OG letterbox + global image source toggles

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-portal-og-letterbox-and-global-image-toggles-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly diagnoses why home OG shows the logo (Admin + 1.5s budget / no Function escape hatch) and why design shares crop (Facebook 1.91:1 frame). On-demand sharp letterboxing via a public image Function is the right quality path, and Studio toggles match the owner’s A/B needs. Approve with a short implement checklist so security and cache behavior stay tight.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Letterbox + global source toggles + Function fix; fb:app_id / prod deploy out |
| Architecture alignment | pass | Services + Functions; Portal does not call Storage from UI |
| Security impact addressed | pass | Public GET ready-only; owner callable unchanged posture |
| Data model impact addressed | pass | Additive settings fields + resolve defaults |
| Backend impact addressed | pass | New Functions + soft-deploy to fresh-prints-dev |
| Test strategy adequate | pass | Shared unit tests + Facebook Debugger manual |
| Human checkpoints identified | pass | Manual scrape; soft-deploy to QA |
| Roadmap alignment | pass | Follow-on to #11 OG / first-load findings |
| Documentation plan | pass | DATA_MODEL, BACKEND, DEPLOYMENT |
| No silent scope expansion | pass | No pre-gen pipeline; daily not random rotation |

---

## Architecture Review

**Findings:**
- Mirroring design-share Function pattern for global meta is the correct fix for App Hosting / local ADC gaps.
- Compositor belongs in Functions (sharp already present); Portal only embeds absolute HTTPS URLs in metadata.

**Required changes:**
- [x] Portal global meta must **prefer Function first**, Admin only as optional fallback (do not reintroduce blocking Admin budget as primary path).

---

## Security Review

**Findings:**
- Public image endpoint must reject non-ready / missing designs with 404; validate `designId` like existing OG Function.
- Do not accept arbitrary Storage paths from query string — resolve path only from the design doc.
- Cap input size / use sharp `limitInputPixels` consistent with other Functions helpers.

**Required changes:**
- [x] Compositor resolves storage path solely from ready design document fields (`previewPath` / `thumbnailPath`).
- [x] Apply input pixel / byte safety limits on sharp read.

**Human approval needed before production:**
- [x] Production Functions/App Hosting deploy (out of scope this phase)

---

## Data Model Review

**Findings:**
- Additive `letterboxOgImages` and `globalOgImageSource` with defaults is fine; no destructive migration.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Soft-deploy must include: `updatePortalSocialMetaSettings`, `getPortalGlobalOpenGraph`, `getPortalOgShareImage`, and updated `getPortalDesignShareOpenGraph` if it emits letterbox URLs.
- Image responses need `Content-Type` + `Cache-Control` (e.g. public max-age ≥ 1h; include `fit` in URL for mode separation).
- When letterbox is off, keep signed raw preview URLs (existing); compositor Function need not be hit.

**Required changes:**
- [x] Include `fit` (or equivalent) query on letterbox image URLs so Facebook cache does not stick after toggle.
- [x] Soft-deploy list explicitly covers all touched Functions.

---

## Testing Review

**Findings:**
- Shared parse/resolve tests for new fields are mandatory.
- Manual Debugger checks for both home and design share are mandatory (Facebook cache).

**Required changes:**
- [ ] None beyond plan

---

## Documentation Review

**Findings:**
- Update DATA_MODEL / BACKEND / DEPLOYMENT OG sections as planned; note logo fallback root cause is fixed via Function.

---

## Required Changes (if approved_with_changes)

1. Portal global OG: Function-first; do not rely on Admin 1.5s budget as primary.
2. Compositor: ready-only; paths from design doc only; sharp input limits.
3. Letterbox `og:image` URLs include a `fit` (or mode) query for cache separation; soft-deploy all touched Functions to fresh-prints-dev.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Scope is narrow, security posture matches existing public OG Function, and the approach fixes the real logo-fallback bug while giving the owner the requested toggles. Conditional approval only to lock Function-first + compositor safety into implement.

---

## Next Step

Implement approved scope with the three required changes above.
