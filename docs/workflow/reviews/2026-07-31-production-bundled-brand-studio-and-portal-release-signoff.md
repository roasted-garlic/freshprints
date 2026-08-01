# Signoff: Production bundled brand assets (Studio installer + Portal App Hosting)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` Part B |
| Implement | `f0f555a` on `development`; promoted via PR #14 |
| Release checkpoint | `docs/workflow/reviews/2026-07-31-production-bundled-brand-studio-and-portal-release-checkpoint.md` |
| Final status | **approved** |

---

## Summary

Bundled brand assets are live in production for both products. Owner QA of the production Studio
installer and hosted Portal branding: **PASS**.

This closes the branding production-release slice under Goal #13. Goal #13 `production-release`
continues (Stage 2 hosted.app smoke and custom-domain cutover remain deferred until owner
authorizes).

---

## Changes Delivered

### Behavior

- Studio installer ships new wordmark, collapsed mark, and Windows app icon (8% padding)
- Portal hosted.app serves new logos, favicons, and manifest icons
- `AppLogo` / `PortalLogo` `onError` fallbacks use bundled assets
- Aspect ratios: Studio full `10800/2851`, Portal full `9940/2430`

### Production

| Item | Value |
|------|-------|
| Merge | PR #14 → `ac837b5d6a80837b68b91d8ed837d465fc94d2af` |
| Studio installer | `Fresh Prints-Windows-0.0.0-Setup-bundled-brand.exe` (SHA-256 `E47B1776…8D65`) |
| Portal rollout | `build-2026-07-31-005` SUCCEEDED |
| Revision | `fresh-prints-portal-build-2026-07-31-005` |
| Automatic rollouts | remain disabled |

### Explicit non-changes

Functions, Rules, indexes, Auth, Storage, production data, DNS, custom domain — unchanged.

---

## Tests

### Automated / release verification

- Production merge scope verified (branding + docs only)
- Studio build exit 0; embedded `fresh-prints-prod`; packaged logos/icons verified
- Portal rollout SUCCEEDED; hosted logo/favicon hashes matched production tree

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Production Studio installer + hosted Portal branding | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date |
|----------|--------|------|
| `APPROVE BRAND ASSET MAPPING` | obtained | prior |
| `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` | obtained | 2026-07-31 |
| Dev visual QA | **PASS** | 2026-07-31 |
| `APPROVE PRODUCTION STUDIO INSTALLER: BUNDLED BRAND ASSETS` | obtained | 2026-07-31 |
| `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: BUNDLED BRAND ASSETS` | obtained | 2026-07-31 |
| Production branding QA | **PASS** | 2026-07-31 |

---

## Risks / follow-ups

- Stage 2 hosted.app smoke still not executed
- Custom-domain cutover still deferred
- Studio installer unsigned; not publicly distributed
- TD-029 (Portal username HTML `pattern`) remains open from prior registration QA notes

---

## Final Status

**approved** — branding production slice closed. Goal #13 continues; next gated step is Stage 2
when the owner authorizes it (checklist already prepared:
`docs/workflow/reviews/2026-07-31-production-stage-2-hosted-app-smoke-checklist.md`).
