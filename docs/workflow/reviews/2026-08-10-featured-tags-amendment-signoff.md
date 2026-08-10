# Signoff: Featured Tags amendment

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-10-featured-tags-amendment-plan.md` |
| Review | `docs/workflow/reviews/2026-08-10-featured-tags-amendment-review.md` |
| Owner QA | `docs/workflow/reviews/2026-08-10-featured-tags-owner-qa-checklist.md` |
| Parent goal | `prelaunch-companion-designs-and-censored-content` (DEV signed off earlier; this amendment ships in same prod promote) |
| Final status | **approved_with_notes** |

---

## Summary

Staff can mark catalog tags **Featured on Portal** in Studio Tag Management. Portal tag filter modal shows featured pills only when those tags appear in the current Algolia facet list (with count), sharing the same multi-tag AND selection as the checkbox list. No Algolia schema change for `isFeatured`. Owner DEV QA: **PASS**.

---

## Changes Delivered

### Behavior
- Firestore `tags.isFeatured?: boolean` (optional); Rules + composite index `status` + `isFeatured`
- Studio Tag Management: Featured checkbox + badge; create/update clears taxonomy caches; Design Library reloads authoritative tags after Tag Management
- TagChipInput empty suggestions prioritize featured tags
- Portal: featured pills = featured ∩ Algolia facets (positive count when present); multi-tag AND unchanged
- Rules: `catalogMetadataOnlyUpdate` fast path so Edit Design tag saves on enrichment-heavy ready designs do not hit expression-budget permission-denied

### Documentation Updated
- Plan, review, owner QA checklist; promotion plan/checkpoint include Featured Tags
- `DATA_MODEL` / promotion docs as amended in implement pass

---

## Tests

### Automated
- Featured pill util + Studio suggestion / taxonomy reload wiring tests — **pass**
- Portal/Studio typecheck (prior implement pass) — **pass**
- `npm run test:rules` after metadata fast path — **89/90** (1 remaining: large-`aiSuggestions` seed with explicit+companion already set → ready expression-budget edge case; Edit Design tags ALLOW; sequential approve suite green)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Featured Tags owner DEV QA checklist | **PASS** | Owner (`DEV FEATURED TAGS QA: PASS`) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required for this amendment alone | 2026-08-10 | Bundled into pending prod promote checkpoint |
| Database migration | N/A | | Optional field; no backfill |
| Design / UX | obtained (DEV QA) | 2026-08-10 | Owner PASS |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Rules expression-budget: large AI + explicit+companion seed → ready (1 emulator case) | Low | Documented; sequential + Edit Design tags paths green; monitor approve on heavy docs |
| Featured pills require design assignment + Algolia sync before Portal shows them | Info | By design — same as normal facet tags |
| Prod Rules/indexes for `isFeatured` not yet deployed | Medium | Covered by production promotion checkpoint |

---

## Deferred Items (Roadmap)
- Production promote of prelaunch bundle **including Featured Tags** (await `APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED`)
- Optional future: further Rules expression-budget hardening for combined approve path

---

## Open Blockers
- [x] None for this amendment on DEV

---

## Verdict

**approved_with_notes** — Owner DEV QA PASS. Notes: one emulator expression-budget edge case remains; production promotion still gated separately; `fresh-prints-prod` untouched.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated (Featured Tags DEV complete; still in promote shipment)
- [x] Handoff package: **not present** in repo (`references/project-chatgpt-handoff/` absent) — N/A

**Recommended next action for user:** Approve production promotion when ready with:

```text
APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED
```
