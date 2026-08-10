# Owner QA Checklist: Companion waiting-queue + Explicit Content (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | **fresh-prints-dev** only |
| Amendment | `docs/workflow/plans/2026-08-09-companion-waiting-queue-vs-link-membership-amendment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-09-companion-waiting-queue-vs-link-membership-amendment-review.md` |

---

## Prerequisites

Studio → `fresh-prints-dev` (`npm run dev:studio`). Portal local → `fresh-prints-dev`. Do **not** use production / myprintrequest.com for this pass.

---

## Companion — waiting queue vs link (corrective)

- [ ] AI Review: **Expects companion design(s)** ON + Approve → design is **ready**; **Needs Companion** in Library filter; Firestore has **no** new `companionSets` doc and **no** `companionSetId` (queue flag only)
- [ ] Two designs both Needs Companion / unlinked remain **unrelated** until Link
- [ ] Design Details compact view: **NEEDS COMPANION** badge OK; full Companion management only after **View more details**
- [ ] **Link Companion** opens searchable picker (thumb + title); Needs Companion designs easy to find; no primary Design ID paste field
- [ ] Link A+B → one set; both share `companionSetId`; still Needs Companion until Mark Complete
- [ ] Link C into A/B → joins same set; no second set
- [ ] Member cards: thumb → lightbox; truncated title; THIS DESIGN; per-card Unlink with confirm; Cancel does nothing
- [ ] Unlink one of two → set dissolves; remaining may stay Needs Companion; no fake 1-member set
- [ ] Mark Complete clears Needs Companion for members **without** unlinking
- [ ] Mark Needs Companion again does **not** change links
- [ ] Portal: Matching designs only for other **ready** linked peers; unlinked Needs Companion shows **nothing** about companions
- [ ] Companion ops never change catalog `status`

## Explicit / Censored (regression)

- [ ] Explicit ON approve still works; Portal censor / reveal / preference unchanged
- [ ] Halftone + Explicit still work together

## Reply phrases

```
DEV COMPANION CENSORED QA: PASS
```

```
DEV COMPANION CENSORED QA: FAIL: <description>
```

```
DEV COMPANION CENSORED QA: PASS WITH NOTES: <notes>
```

Until PASS: **no production promotion**. Confirm prod / Algolia / App Hosting / Studio package / myprintrequest.com untouched.
