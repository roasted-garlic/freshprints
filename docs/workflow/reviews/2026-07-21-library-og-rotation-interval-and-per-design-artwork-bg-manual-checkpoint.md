# Manual Test Checkpoint: Library OG rotation + per-design artwork backgrounds

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Workflow | managed-phase / test / library OG rotation + per-design artwork bg |
| Reason | UI/visual + Facebook OG cache require human verification |
| Status | **resolved** |
| Resolution | **PASS** (2026-07-21) |

---

## What We Need From You

Verify Studio rotation intervals + Pick next, per-design artwork backgrounds in Studio/Portal, and Facebook Debugger letterbox margins after soft-deploy to fresh-prints-dev.

---

## Context

- Soft-deployed: `updatePortalSocialMetaSettings`, `getPortalGlobalOpenGraph`, `getPortalDesignShareOpenGraph`, `getPortalOgShareImage` → **fresh-prints-dev**.
- Intervals shipped: **daily**, **hourly**, **5 minutes**, **1 minute**, **30 seconds** (+ Pick next).
- **No “each share” option** — Facebook/WhatsApp/Messenger cache OG by page URL; short intervals / Pick next are the alternatives.
- Per-design `artworkBackgroundHex`: grey (default), light black `#2c2d2d`, or custom hex — drives mats + OG letterbox.

Plan: `docs/workflow/plans/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-plan.md`

---

## Manual Test Required

**Feature / area:** Library OG rotation interval + per-design artwork backgrounds  
**Why automated tests are insufficient:** Visual mats + live Facebook OG cache  
**Environment:** local Studio + Portal against fresh-prints-dev (or tunnel)  
**Prerequisites:** Owner Studio login; at least one ready catalog design; Facebook Sharing Debugger

### Steps

1. **Studio → Settings → Social sharing**  
   → **Expected:** Library rotation interval dropdown lists Daily / Hourly / Every 5 minutes / Every 1 minute / Every 30 seconds. Help text notes social apps cache previews (no every-share). Pick next still works when Library is selected.

2. Set interval to **30 seconds** (or 1 minute), save, open Facebook Debugger on Portal home, **Scrape Again** twice after the bucket advances (or use Pick next between scrapes).  
   → **Expected:** Library `og:image` can change after interval/Pick next + Scrape Again. Same scrape within a bucket stays stable unless salt bumped.

3. **Studio → Design Library → Edit design** → Artwork background: try **Light black**, save; open design card/lightbox.  
   → **Expected:** Mat behind artwork is dark (`#2c2d2d`). Portal catalog card + details lightbox for that design match.

4. Set **Custom hex** (e.g. `#aabbcc`), save; invalid hex is rejected. Reset to **Grey (default)** and save.  
   → **Expected:** Custom applies; grey clears persisted field (mat returns to theme grey).

5. Facebook Debugger on `/share/design/{id}` for a design with light black (letterbox on).  
   → **Expected:** Letterbox margins match design bg (not always grey). `og:image` URL includes `bg=2c2d2d` (or the custom hex without `#`).

### Pass criteria

- [x] Interval dropdown has five options; no fake “each share”
- [x] Pick next still forces a new library preview after Scrape Again
- [x] Studio + Portal mats follow per-design background
- [x] Design-share OG letterbox margins + `bg=` query match design color

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** (2026-07-21)

---

## Impact If Delayed

Signoff blocked until PASS / FAIL / PASS WITH NOTES.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions  

**Forbidden:** Implement, deploy, migrate, change secrets, expand scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-21 | PASS on the previous work (covers this parked OG rotation + per-design artwork bg checkpoint along with Studio UI fixes) | yes | Signoff |
