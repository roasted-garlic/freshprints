# Owner QA Checkpoint: Interactive Upscale DPI rehydration + `<250` eligibility (DEV)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Corrective | `interactive-upscale-dpi-rehydration-and-eligibility` |
| Parent goal | `firestore-rules-print-request-item-resize-expression-budget` |
| Environment | **fresh-prints-dev** only |
| Portal runtime | `npm run dev:portal` → `http://localhost:3100` (no App Hosting on DEV) |
| Studio runtime | `npm run dev:studio` (local Electron / Vite) |
| Functions deployed | `setPrintRequestItemArtworkEnhanceMode`, `enhancePrintRequestArtwork` |
| Owner QA result | **PASS** (2026-09-03) |

---

## Owner final result

**OWNER INTERACTIVE UPSCALE DEV QA: PASS**

| Area | Result |
|------|--------|
| Portal Library hydration | PASS |
| Portal customer-upload hydration | PASS |
| Studio Library hydration | PASS |
| Studio customer-upload hydration | PASS |
| Navigate away/back | PASS |
| Add/upload another item | PASS |
| Full reload | PASS |
| Multi-item independence | PASS |
| `<250` initiation | PASS |
| Exactly 250 denied | PASS |
| `>250` denied | PASS |
| Existing ON state preserved | PASS |
| 200 DPI save floor unchanged | PASS |
| 300 optimal behavior unchanged | PASS |
| Badge/eligibility rounding consistent | PASS |
| OFF→ON repair required | **NO** |

Recorded 2026-09-03. Parent Signoff proceeds separately.
## Deploy record (this session)

### Deploy-surface audit

| Surface | Result |
|---------|--------|
| Shared eligibility change | `packages/shared/src/utils/interactiveArtworkEnhance.ts` — offer/target gate uses `INTERACTIVE_UPSCALE_OFFER_MIN_DPI` (250) |
| Functions importing that helper | Only via `functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.ts` → `resolveInteractiveEnhanceTargetPixels` |
| Exported callables using that core | **`setPrintRequestItemArtworkEnhanceMode`**, **`enhancePrintRequestArtwork`** (legacy wrapper) |
| Broader Functions surface | **No** — two callables only |
| Functions deploy required | **YES** |

### Functions DEV deploy

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:setPrintRequestItemArtworkEnhanceMode,functions:enhancePrintRequestArtwork" --project fresh-prints-dev
```

| Function | Region | Runtime | State | Revision | Traffic |
|----------|--------|---------|-------|----------|---------|
| `setPrintRequestItemArtworkEnhanceMode` | us-central1 | Node.js 20 (2nd Gen) | ACTIVE | `setprintrequestitemartworkenhancemode-00008-yob` | 100% latest |
| `enhancePrintRequestArtwork` | us-central1 | Node.js 20 (2nd Gen) | ACTIVE | `enhanceprintrequestartwork-00003-xut` | 100% latest |

Deploy exit: **success** (`Deploy complete!`). Update times ~2026-09-03T17:40:40–42Z.

### Portal DEV procedure

Per `docs/standards/DEPLOYMENT.md`: **no** Firebase App Hosting on `fresh-prints-dev`. Portal DEV = localhost.

```bash
npm run dev:portal
# http://localhost:3100 — .env.local NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev
```

**Result:** Portal `npm run dev:portal` already running; project id confirmed `fresh-prints-dev`; corrective source present in working tree (HMR).

### Studio DEV procedure

```bash
npm run dev:studio
# apps/studio/.env.local VITE_FIREBASE_PROJECT_ID=fresh-prints-dev
```

**Result:** Studio `npm run dev:studio` already running; project id confirmed `fresh-prints-dev`; corrective source present.

### Explicitly not touched

| Surface | Status |
|---------|--------|
| Firestore Rules deploy | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration/backfill | **NO** |
| Production / App Hosting / Studio release | **NO** |
| Commit / push / Signoff | **NO** |

---

## Manual Test Checkpoint

**Feature / area:** Interactive Upscale DPI rehydration + `<250` initiation (TD-033)  
**Why automated tests are insufficient:** Full remount/navigate/upload/reload/multi-item UX + live callable + badge rounding  
**Environment:** local Portal + Studio against **fresh-prints-dev**  
**Prerequisites:** Sign in with DEV accounts that can edit Print Requests; Functions revisions above ACTIVE

### Portal — Library (P1–P5)

1. Add Library design → resize until **displayed** DPI is **245–249** → **Expected:** Upscale available  
2. Turn Upscale ON → **Expected:** succeeds; badge uses enhanced pixels (not baseline ~213–225); record before/after DPI  
3. Navigate away / other action / return → **Expected:** Upscale ON; **same** enhanced DPI (TD-033)  
4. Add Library item B; return to A → **Expected:** A unchanged; upscale B if eligible; switch A↔B independently  
5. With A enhanced, upload another artwork → return to A → **Expected:** A DPI still correct  
6. Full browser reload → reopen → **Expected:** Upscale ON; correct enhanced DPI; **no** OFF→ON repair  

### Portal — Customer upload

If supported: upload → size `<250` → Upscale ON → navigate / add item / reload → enhanced DPI holds.

### Studio — Customer upload (critical)

Use **already-upscaled** upload item. **Do not toggle first.**  
**Expected on initial load:** Upscale ON + correct enhanced DPI. Navigate away/back / remount → same. OFF→ON must not be required to repair.

### Studio — Library

Upscaled catalog item: correct DPI on load, navigate, remount; no toggle repair.

### Threshold / save / existing ON

| Case | Expected |
|------|----------|
| Displayed DPI **&lt;250** (e.g. 249) | New Upscale **AVAILABLE** |
| Displayed DPI **=250** | New Upscale **NOT** available |
| Displayed **250–299** (e.g. 260/275) | Warning OK; new Upscale **NOT** available |
| Displayed **300+** | Optimal; new Upscale **NOT** available |
| Already ON with enhanced ≥250/300 | Remains ON; no auto-clear |
| Displayed 250 vs toggle | Must **agree** (no badge 250 + toggle still on) |
| `<200` | Cannot save (unchanged) |
| 200–249 | Warning + upscale eligible |
| 250–299 | Warning + upscale **not** eligible |

### Multi-item matrix

A = Library, B = customer upload (both upscaled if eligible). Switch, navigate, add unrelated item, reload. Independent source/mode/dims/DPI; no leakage.

### Pass criteria

- [ ] Portal Library hydration (navigate / add / upload / reload)  
- [ ] Portal customer-upload hydration (if supported)  
- [ ] Studio Library hydration  
- [ ] Studio customer-upload hydration **without** OFF→ON repair  
- [ ] Multi-item independence  
- [ ] `<250` allow / `250` deny / `>250` deny  
- [ ] Existing ON preserved at ≥250  
- [ ] 200 floor + 300 optimal unchanged  
- [ ] Badge ↔ eligibility rounding consistent  
- [ ] No permission / Rules regressions on resize+upscale  

### Please reply with

- `OWNER INTERACTIVE UPSCALE DEV QA: PASS` — all criteria met (include brief notes per section)  
- `FAIL: [app/source/item/state/repro]`  
- `PASS WITH NOTES: [notes]`  

---

## After Owner reply

- Record result in this doc + workflow state  
- TD-033 stays open until PASS (or documented notes)  
- Parent Rules Signoff / commit / push still require separate authorization  
