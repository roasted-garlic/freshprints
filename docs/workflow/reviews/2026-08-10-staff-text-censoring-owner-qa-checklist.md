# Owner QA Checklist: Staff text censoring (`censoredTerms`)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Environment | **fresh-prints-dev** Studio + Portal |
| Reply with | `DEV TEXT CENSOR QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …` |

---

## Studio — AI Review

- [ ] Enable **Explicit Content** → **Words/phrases to censor** chip field appears
- [ ] Add terms: `fuck`, `motherfucker`, `eat my ass` → Approve/save persists
- [ ] Reload design → terms still present
- [ ] Turn Explicit Content **off** → terms field hidden but terms still stored (re-enable Explicit → terms return)

## Studio — Design Library Edit

- [ ] Edit ready design with Explicit on → same censor chip field editable
- [ ] Add/remove term → Save succeeds (no permission-denied)
- [ ] No AI reprocess required

## Portal — Censored mode (default)

- [ ] Explicit design with terms: title/description show `****` / `*** ** ***` style masks (no first letter)
- [ ] `ass` term does **not** break words like `class` in title/description
- [ ] Image blur / Click to reveal still works as before
- [ ] **Click to reveal** on Design Details (or Share) also unmasks title + description for that open session
- [ ] Closing Details / opening another design re-masks text until reveal again
- [ ] Non-explicit designs unchanged
- [ ] Explicit with **no** terms: title/description unchanged

## Portal — Uncensored mode

- [ ] Toggle **Uncensored** → original title + description restored
- [ ] Toggle back to **Censored** → masks return

## Surfaces spot-check

- [ ] Catalog card title
- [ ] Design details title + description
- [ ] Share page title + description
- [ ] Matching designs / companion suggestion titles

## Safety

- fresh-prints-prod / App Hosting prod / Studio prod / Algolia / myprintrequest.com: **untouched**
