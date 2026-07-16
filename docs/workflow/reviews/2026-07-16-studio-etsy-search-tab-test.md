# Test Report: Studio Etsy search tab + tab order

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Phase | test |
| Plan | docs/workflow/plans/2026-07-16-studio-etsy-search-tab-plan.md |
| Status | **partial** — implementation complete; rules deploy + manual QA pending |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Studio `tsc` | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 2 | **Blocked by pre-existing** `ignoreDeprecations` tsconfig error (unrelated to this change) |
| IDE/lints on touched customer-requests files | ReadLints | — | No issues |

---

## Manual Test Checkpoint

**Feature / area:** Custom Designs tabs — Etsy search list  
**Why automated tests are insufficient:** Needs live Firestore + staff auth + rules deploy.  
**Environment:** Studio against Firebase project with updated rules  
## Deploy (`fresh-prints-dev`)

Staff list needs rules (if not already deployed):

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Wipe target `etsySearches` needs the updated callable:

```bash
firebase deploy --only functions:wipeOperationalTestData --project fresh-prints-dev
```

Or both:

```bash
firebase deploy --only firestore:rules,functions:wipeOperationalTestData --project fresh-prints-dev
```

### Steps

1. Open Custom Designs.  
   **Expected:** Tab order left→right: AI Design, Fresh Prints Assisted, **Etsy**, **Suggestions**. Default tab is Etsy.
2. With rules deployed and at least one Portal Find submit in the project.  
   **Expected:** List shows recent searches; **Open Etsy** works.
3. Owner on `npm run dev` Studio + fresh-prints-dev: wipe via **Test Data → Etsy searches** only (not on the Etsy tab).  
   **Expected:** List clears after wipe; Etsy tab has no Wipe button.
4. Select a left-list card.  
   **Expected:** Right pane shows full answers + Best match / broader browse cards (Portal-style).
5. Suggestions tab (far right) still works.

### Pass criteria

- [ ] Tab labeled **Etsy**; order and default correct
- [ ] List loads after rules deploy; two-column select + detail with browse cards
- [ ] Wipe only via Test Data → Etsy searches (after function deploy)
- [ ] Suggestions still works on the right

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Confirm whether rules were deployed to fresh-prints-dev

---

## Notes

- Rules change is local in repo until deployed.
- Parked: studio-customer-requests-suggestions still needs its own deploy/QA if not already done.
