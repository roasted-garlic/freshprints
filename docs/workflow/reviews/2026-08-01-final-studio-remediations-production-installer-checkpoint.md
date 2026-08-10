# Final Studio remediations production installer checkpoint

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Verdict | **PASS — installer built and verified; owner QA pending** |
| Production merge commit | `fe8c4f05675d1f47e532982089dc744b75b44786` |
| PR | `#18` — clean release branch merged into `production` with a merge commit |
| Installer | `Fresh Prints-Windows-0.0.0-Setup-final-studio-remediations.exe` |
| Exact path | `C:\coding\fresh-prints\apps\studio\release\0.0.0\Fresh Prints-Windows-0.0.0-Setup-final-studio-remediations.exe` |
| Size | `106,248,254` bytes |
| SHA-256 | `E5F2FC14DC976EE036DBBDF7F08C6F6B598CAF134DD1B05431E7FC43A1C603CC` |

## Included remediations

- Whatnot updates reuse the exact matched show document and preserve non-Whatnot state.
- Donated Designs overflow opens normally below its trigger, with collision-aware upward fallback.
- Customer Uploads and Donated Designs share reversible metadata-only exclusion and actor-independent restoration.
- Exclusion, restoration, and permanent deletion use accessible in-app dialogs.
- Permanent deletion is owner/admin-only, helpers are denied in UI and trusted backend authorization, dependencies fail closed, and only validated upload-owned assets are removed.

## Verification

- Focused remediation tests: **75/75 PASS**.
- Production-only debug-tool gate tests: **6/6 PASS**.
- Functions TypeScript build: **PASS**.
- Studio TypeScript check: **PASS**.
- Repository lint: **PASS**.
- Studio production build and NSIS packaging: **PASS**.
- `git diff --check`: **PASS** before packaging documentation.
- Embedded Firebase project: `fresh-prints-prod`, using the approved production Web configuration.
- Fresh Prints `app-icon.png` and both expanded/collapsed Studio logo assets are present in `app.asar`; electron-builder applied `apps/studio/icon.ico` to the executable.
- Packaged production debug gates deny Test Data Reset. Catalog Storage Inventory is not present as an exposed production action.

## Non-actions

- The installer was not installed or distributed automatically.
- `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, and `excludeCustomerUploadFromCatalog` were **not deployed** to production.
- No Rules, indexes, Portal, production data/settings, Auth/secrets, Stage 2, DNS, domain, analytics, or release-tag action occurred.

Next checkpoints:

`APPROVE PRODUCTION FUNCTIONS DEPLOY: CUSTOMER UPLOAD EXCLUSION AND DELETION`

`CONTINUE WORKFLOW: PRODUCTION OWNER QA FINAL STUDIO REMEDIATIONS`
