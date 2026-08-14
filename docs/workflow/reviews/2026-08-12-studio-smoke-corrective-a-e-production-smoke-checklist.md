# Production smoke checklist: Studio 1.0.4 dual-platform draft (Windows + corrective A–E)

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Feature / area | Fresh Prints Studio **1.0.4** Windows installer from dual-platform **DRAFT** |
| Draft release ID | `369431950` |
| Build SHA | `d1987b023db2cf18411720e4df41d8b3e20a7226` |
| Distribution | `internal-unsigned` |
| Environment | Production Firebase `fresh-prints-prod` + Algolia `Z1FVCM5QUX` / `portal_catalog_ready_prod` |
| Why automated tests are insufficient | Packaged Electron install, auth, Helper permissions, and production data require a real Windows workstation |

## Installer

- Download from draft `369431950`: `Fresh-Prints-Windows-1.0.4-Setup.exe`
- SHA-256: `d20fdfcc2b653aee0b95c5607f818bf330a87211974a97566f80a84edb1e3ec0`
- Size: `107365398` bytes

## Reduced production smoke (Helper + Owner/Admin)

### Helper

- [ ] Install/update Studio **1.0.4** from the draft installer (same SHA as Mac packages)
- [ ] Launch + login against production
- [ ] Design Library / search / tags-categories spot-check
- [ ] Helper can Send to AI Processing for eligible uploaded designs
- [ ] Helper can complete AI Review / image-processing workflow
- [ ] Helper can edit / review / approve / reject as intended
- [ ] No permission-denied on intended paths
- [ ] Helper remains non-admin
- [ ] Helper does **not** have Show Queue Settings
- [ ] Spot-check: tag facet counts before Load More; Load More with filters; AI tags do not wipe human tags
- [ ] Update check does not crash
- [ ] Quit / relaunch works

### Owner / Admin

- [ ] Owner/Admin Show Queue Settings still works
- [ ] Customer Uploads / Print Requests / Imports spot-check as needed for A–E confidence

## Pass criteria

- [ ] All Helper criteria PASS on Windows 1.0.4 draft build
- [ ] Owner/Admin Show Queue Settings still works
- [ ] No DEV Firebase/Algolia behavior observed
- [ ] Mac x64 + Mac arm64 smokes also PASS on the **same** draft SHA (see Mac checklist)

### Please reply with

- `WINDOWS SMOKE 1.0.4: PASS`
- `WINDOWS SMOKE 1.0.4: FAIL: …`
- `WINDOWS SMOKE 1.0.4: PASS WITH NOTES: …`

## Related

- Mac checklist: `docs/workflow/reviews/2026-08-12-studio-1.0.4-macos-smoke-checklist.md`
- Draft verification: `docs/workflow/reviews/2026-08-12-studio-1.0.4-dual-platform-draft-verification.md`
- Prior A–E promotion notes: `docs/workflow/reviews/2026-08-12-studio-smoke-corrective-a-e-production-promotion-checkpoint.md`
