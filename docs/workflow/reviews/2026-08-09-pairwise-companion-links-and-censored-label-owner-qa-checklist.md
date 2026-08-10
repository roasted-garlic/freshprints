# Owner QA Checklist: Pairwise companions + Censored/Uncensored label

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | **fresh-prints-dev** Studio + Portal |
| Reply with | `DEV PAIRWISE COMPANION QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …` |

---

## Prep (important)

Old `companionSets` clique data is **ignored** by the new model and was **not** auto-converted (intent unknowable).

1. Prefer testing with designs that have **no** stale `companionSetId`, or clear/re-link after opening Companion Designs.
2. Build the turtle graph **explicitly**:
   - Link Front A ↔ Back D
   - Link Front B ↔ Back D (D already linked to A — must still be allowed)
   - Link Front C ↔ Back D

---

## Pairwise Studio

- [ ] Link A↔D creates one relationship; A lists D; D lists A
- [ ] Link B↔D while D already has A — succeeds; picker still shows D when editing B
- [ ] Link C↔D — D lists A,B,C; A lists only D (not B/C)
- [ ] A↔B and B↔C does **not** make A list C
- [ ] Duplicate A↔D is no-op / no error storm
- [ ] Unlink D↔B removes only that edge; D still linked to A and C
- [ ] Companion modal: thumbs, lightbox, truncated titles, unlink confirm, live refresh without reopen
- [ ] Needs Companion: can mark only when zero links; first link clears it; cannot mark while linked; last unlink does **not** auto-mark

## Portal Matching Designs

- [ ] D shows A,B,C (ready only)
- [ ] A shows only D (not B/C)
- [ ] No second-degree / “you may also like” behavior
- [ ] List-card “Matching designs available” uses hydrated neighbors (no janky N+1)
- [ ] Post-add suggestion shows direct ready neighbors only; never auto-adds

## Censored toggle

- [ ] Off/default visible label: **Censored**
- [ ] On visible label: **Uncensored**
- [ ] List still: Censored Content (no Click to reveal on cards)
- [ ] Details: one Click to reveal; lightbox no second gate
- [ ] Mobile filter layout healthy

## Regression

- [ ] Explicit Content + Halftone approve still work on DEV
- [ ] Companion ops never change catalog `status`

---

## Safety confirmations (agent)

- fresh-prints-prod: untouched
- App Hosting prod: untouched
- Studio prod package: untouched
- Algolia: untouched
- myprintrequest.com: Coming Soon / untouched
