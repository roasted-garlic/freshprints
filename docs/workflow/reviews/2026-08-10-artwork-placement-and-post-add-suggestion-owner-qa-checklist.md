# Owner QA Checklist: Artwork Placement + post-add suggestion fix

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Environment | **fresh-prints-dev** Studio + Portal |
| Reply with | `DEV PLACEMENT SUGGESTION QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …` |
| Owner result | **PASS** (2026-08-10) — full prelaunch companion/censored goal also COMPLETE / PASSING |

---

## Placement (Studio)

- [ ] Companion Designs modal shows Placement badge on each card (Unspecified when unset)
- [ ] Can set Placement to Front / Back / Front / Back / Pocket / Sleeve from Companion modal
- [ ] Changing Placement does **not** change links, catalog status, or Needs Companion
- [ ] Edit Design form also has Placement select (if present)
- [ ] Badge labels match: FRONT, BACK, FRONT / BACK, etc. (or readable equivalents)

## Placement (Portal)

- [ ] Matching Designs cards show Placement badge when set (lightweight)
- [ ] No Placement filter / search / Algolia facet

## Post-add Matching Designs

- [ ] Add Front A → modal suggests Back D (if linked and ready, not already in request)
- [ ] Add Back D when A already in request → **no** modal suggesting A again
- [ ] Shared Back D linked to A/B/C with A already in request → modal may show B and C only (not A)
- [ ] Add companion **from** the open Matching Designs modal → no nested/second modal; item disappears from list; modal closes when list empty
- [ ] Never auto-adds companions

## Regression

- [ ] Pairwise-only matching (no transitive)
- [ ] Censor reveal + Censored/Uncensored toggle still OK
- [ ] Current Request qty/size behavior unchanged

---

## Safety (agent)

- fresh-prints-prod / App Hosting prod / Studio prod / Algolia / myprintrequest.com: **untouched**
- DEV Rules deployed for `artworkPlacement` optional string
