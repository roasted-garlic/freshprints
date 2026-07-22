# Signoff: Portal OG letterbox + global image toggles

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Goal | `portal-og-letterbox-and-global-image-toggles` |
| Plan | docs/workflow/plans/2026-07-21-portal-og-letterbox-and-global-image-toggles-plan.md |
| Review | docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-review.md |
| Test report | docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-test-report.md |
| Manual checkpoint | docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-manual-checkpoint.md |
| Status | **approved** |

---

## Result

**Approved.** Design-share OG letterbox (1200×630 contain) + Studio Social sharing toggles (letterbox on/off, global library vs logo, rotation intervals, Pick next) + related cache-bust / global OG Function path.

## Human checkpoints

| Item | Result |
|------|--------|
| Facebook Debugger (letterbox / scrape) | **PASS** (owner 2026-07-21 via PASS ALL) |

## Soft-deploy (dev) — done earlier in phase

`updatePortalSocialMetaSettings`, `getPortalDesignShareOpenGraph`, `getPortalGlobalOpenGraph`, `getPortalOgShareImage` on `fresh-prints-dev`.

## Follow-ups (deferred / out of scope)

- `fb:app_id` / Meta app (owner declined for now)
- Production OG Function rollout when scheduled
