# Owner QA Checklist: Final prelaunch UX (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | **fresh-prints-dev** only |
| Amendment | `docs/workflow/plans/2026-08-09-final-prelaunch-ux-companion-censor-amendment-plan.md` |

## Portal censor
- [ ] Catalog cards: **Censored Content** + **Click to view** opens Details (does not reveal on list)
- [ ] Details: **Click to reveal** once → art visible + small Censored Content indicator; lightbox no second gate
- [ ] List stays censored after details reveal while global **Censored** is OFF
- [ ] **Censored** toggle ON → list shows real art
- [ ] Current Request drawer / request details / show request pages: **no** censor overlay on added items

## Studio companions
- [ ] **Companion Designs** button below View more details → dedicated modal (not inside Audit)
- [ ] Link/unlink updates member list live without closing modal
- [ ] Needs Companion only for unlinked designs; cleared on first link; cannot mark when linked
- [ ] Dissolve does not auto Needs Companion

## Reply
`DEV COMPANION CENSORED QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …`
