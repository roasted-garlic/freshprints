# Manual Test Checkpoint: Brand logo uploads

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Feature / area | Studio + Portal brand logos (full + collapsed) |
| Why automated tests are insufficient | Upload UI, shell chrome, auth pages, and visual fallbacks need human eyes |
| Environment | Local Studio + Portal against **fresh-prints-dev** (after soft-deploy of Functions + rules) |
| Branch | `feature/brand-logo-uploads` |
| Result | **PASS** (owner 2026-07-22) |

## Prerequisites

- [x] Soft-deploy to **fresh-prints-dev** (not production) — `updateBrandLogoDisplaySizes` created 2026-07-22 after owner saw "internal" on Save display sizes (callable had not been deployed yet). Full command if re-deploying:

```bash
firebase deploy --only functions:finalizeBrandLogoSlot,functions:updateBrandLogoDisplaySizes,functions:getPortalGlobalOpenGraph,firestore:rules,storage --project fresh-prints-dev
```

- [x] Studio running as **owner**
- [x] Portal local or tunnel to the same Firebase project
- [x] Four test PNGs (or reuse existing logos), each ≤ 2 MB

### Steps

1. Studio → **Settings → Brand logos**  
   → **Expected:** Four cards (Studio full/collapsed, Portal full/collapsed); defaults labeled correctly; **Display sizes** shows separate **Portal header**, **Portal sidebar** (expanded), **Portal sidebar collapsed**, Portal auth, and Studio sizes. Header and expanded sidebar default to the same box (height 52) but are independent knobs.

2. Change **Portal header** width or height; the other dimension updates automatically (aspect locked). **Save display sizes**  
   → **Expected:** Portal app header logo resizes; expanded sidebar size is unchanged unless you also edit **Portal sidebar**.

3. Change **Portal sidebar** (expanded) independently; confirm header stays at its own size. Then change **Portal sidebar collapsed**; collapse Portal nav  
   → **Expected:** Expanded sidebar uses its own height; collapsed mark uses the collapsed height (independent of header / expanded sidebar).

4. Upload a PNG for **Studio — full**; wait for save  
   → **Expected:** Preview updates; login page + expanded sidebar show the new logo (may need reopen login / remount).

5. Upload **Studio — collapsed**  
   → **Expected:** Collapsed sidebar shows the new mark.

6. Upload **Portal — full** and **Portal — collapsed**  
   → **Expected:** Previews show custom uploads in Settings; Portal chrome uses them at the configured sizes.

7. Open Portal as guest (auth page and/or shell)  
   → **Expected:** Header/sidebar/auth brand marks use the new Portal logos at their configured heights (defaults match; independently tunable).

8. **Clear** one Studio and one Portal slot  
   → **Expected:** Preview returns to default; UI falls back to bundled/static assets (sizes still apply).

9. (Optional after soft-deploy) Social sharing set to **Brand logo**; check `getPortalGlobalOpenGraph`  
   → **Expected:** `imageUrl` is the uploaded Portal full HTTPS URL when set; otherwise null (Portal static path fallback).

### Pass criteria

- [x] Display sizes save; Portal header and expanded sidebar are separate controls (defaults match at 52); collapsed stays independent
- [x] All four slots upload and display in Studio Settings
- [x] Studio chrome (login + sidebar variants) reflects Studio uploads / sizes
- [x] Portal guest/auth + shell reflects Portal uploads
- [x] Clear restores image defaults
- [x] No production deploy performed

### Owner reply

- **PASS** — 2026-07-22 (after sidebar/header size and related chrome fixes)
