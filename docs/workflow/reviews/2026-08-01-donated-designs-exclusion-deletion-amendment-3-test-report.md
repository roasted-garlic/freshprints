# Donated Designs exclusion/deletion Amendment 3 test report

## Results

- Focused Amendment 2/3 tests: **PASS** — 34/34 assertions.
- Functions TypeScript build: **PASS**.
- Studio TypeScript check: **PASS**.
- Studio production build/package verification: **PASS** (existing Vite chunk and electron-builder dependency diagnostics only).
- Repository lint: **PASS**.
- `git diff --check`: **PASS** (line-ending notices only).

## Covered behavior

- Active owner/admin/helper exclusion and restoration authorization is shared and restoration is actor-independent.
- Restoration updates the original document to pending review and creates no duplicate.
- Helper deletion is hidden/denied; owner/admin deletion remains allowed.
- Request-item and promoted-design dependencies block deletion.
- The authoritative asset manifest matches every current `CustomerUpload` Storage-path field.
- Malformed, shared, batch, unrelated, and future-unreviewed Storage paths fail closed.
- Partial Storage failure retains the upload document and reports failure.
- Complete cleanup deletes the upload document and only upload-specific batch manifest/counter metadata; batch archives remain untouched.

Development owner/admin/helper QA remains pending. No production conclusion is recorded.
