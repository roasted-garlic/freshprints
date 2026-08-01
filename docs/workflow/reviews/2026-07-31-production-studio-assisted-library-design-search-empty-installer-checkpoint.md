# Checkpoint: Production Studio installer — Assisted library design search fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval | `APPROVE PRODUCTION STUDIO INSTALLER: ASSISTED LIBRARY DESIGN SEARCH FIX` |
| Slice | `production-studio-assisted-library-design-search-empty` |
| Owner QA | **pending** |

---

## Installer

Built with Vite **shell env overrides** for `fresh-prints-prod` (`.env.local` left on `fresh-prints-dev`; no env file write).

| Field | Value |
|-------|-------|
| Filename | `Fresh Prints-Windows-0.0.0-Setup-assisted-library-search.exe` |
| Also present | `Fresh Prints-Windows-0.0.0-Setup.exe` (same build) |
| Location | `apps/studio/release/0.0.0/` |
| Size | 106,242,754 bytes |
| SHA-256 | `998E875E885D2BCE7D96A0C16FE69092960DE6520D13B4E55EBC791651FDC0B7` |
| Build | `npm run build:studio` → exit 0 |
| Embedded project | Renderer embeds `VITE_FIREBASE_PROJECT_ID:"fresh-prints-prod"`; no `fresh-prints-dev` auth-domain config |
| Fix marker in bundle | Empty-catalog copy string present (`No ready Design Library designs are available yet`) |
| Unsigned | yes — not uploaded publicly |

Prior installers (bundled-brand, rc4/rc5) left untouched on disk.

### Explicit non-changes

- No Functions / Rules / indexes deploy
- No Portal App Hosting rollout
- No production data changes
- No Stage 2 / domain cutover

---

## Manual Test Checkpoint

**Feature / area:** Studio Assisted “Share a library design” empty search  
**Why automated tests are insufficient:** Requires installed Electron Studio against production catalog  
**Environment:** Local Windows install of the installer above (`fresh-prints-prod`)  
**Prerequisites:** Production has ≥1 ready design; staff owner/admin for Send

### Steps
1. Install `Fresh Prints-Windows-0.0.0-Setup-assisted-library-search.exe` → **Expected:** install completes  
2. Sign in to production → **Expected:** `fresh-prints-prod`, not dev  
3. Assisted Creation → **Share a library design**, leave search empty → **Expected:** ready designs listed (not “No ready designs match that search”)  
4. Search by title / design id → **Expected:** filters correctly  
5. Send a design to customer (owner/admin) → **Expected:** existing catalog_share / proof_ready lifecycle  

### Pass criteria
- [ ] Empty search lists ready designs  
- [ ] Search filters work  
- [ ] Send still works for owner/admin  
- [ ] App is on production  

### Owner QA result — **PASS** (2026-07-31)

Signoff: `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-signoff.md`

Stage 2 / domain remain separately gated.

