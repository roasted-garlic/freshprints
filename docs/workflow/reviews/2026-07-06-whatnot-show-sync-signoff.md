# Whatnot Show Sync Signoff

Date: 2026-07-06

Status: PASS WITH NOTES

## Scope Signed Off

The `whatnot-show-sync` managed phase is signed off for the staff-assisted Electron browser import
flow:

- Staff opens the configured Whatnot show-list page in the in-app import window.
- Staff scans visible show cards from the already-loaded page.
- The app previews extracted title/date/URL/ID rows.
- Staff confirms the import.
- Existing local shows are matched by `source + whatnotShowId`; staff-owned planning fields are
  preserved on re-import.
- Relative date labels now include `Today`, `Tomorrow`, and common weekday abbreviations.

Manual QA checkpoint: user reported on 2026-07-06 that the Whatnot show sync is ready to sign off.

## Final Corrections Included

After manual QA surfaced an unparseable `Tomorrow 8:00 PM` badge, the parser was corrected to resolve
`Tomorrow` as the next local calendar day. Weekday handling was also made explicit for common
abbreviations such as `Tues`, `Thur`, and `Thurs`.

The import shell also includes the current worktree's page-ready scan gating and unchanged-list UI
polish so staff cannot scan before the Whatnot page finishes loading and unchanged rows are easier to
review.

## Final Verification

```bash
npx tsx --test (rg --files -g "*.test.ts" shared src)
```

Result: PASS, 435/435.

```bash
npx tsc --noEmit
```

Result: PASS.

```bash
npm run lint
```

Result: PASS.

```bash
npx vite build
```

Result: PASS. Renderer, Electron main, and preload builds completed. Existing circular manual-chunk
warning remains.

```bash
git diff --check
```

Result: PASS, standard Windows LF/CRLF warnings only.

## Notes

No Firebase deploy, Firestore rules deploy, Functions deploy, Hosting deploy, migration, backfill,
new dependency, secret change, server-side scraper, headless browser, or third-party scraping service
was performed.

The Firestore rules deploy for this slice's additive fields remains a separate explicit approval
checkpoint, bundled with the still-outstanding `print-runs-foundation` rules deploy.
