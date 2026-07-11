# Test Report: Portal print progress rail + live elapsed clock

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Plan | docs/workflow/plans/2026-07-10-portal-print-progress-rail-plan.md |
| Result | **passed_with_notes** |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Portal typecheck | `npm run typecheck` in `apps/portal` | 0 | PASS |
| Functions build | `npm run build` in `functions` | 0 | PASS |
| Unit (stage mapping) | `npx tsx --test packages/shared/src/utils/portalPrintProgressStage.test.ts` | 0 | PASS (3) |

---

## Manual QA (outstanding)

Requires **callable deploy** first:

```bash
firebase deploy --only functions:getPortalShowPrintProgress --project fresh-prints-dev
```

Then verify:

- [ ] Queued request: rail on **Queued**; “Waiting for printing to start”
- [ ] Staff Start printing: rail on **Printing**; “Printer running · m:ss” ticks
- [ ] Pause / Resume: clock freezes / resumes
- [ ] Mark finished: rail on **Done**; “Finished · elapsed”
- [ ] Working draft: panel hidden
- [ ] Without deploy: rail still shows; clock shows “Printer timer unavailable” (graceful)

---

## Notes

- Quantity / design checklist intentionally not implemented.
- Gang-sheet-local-generate remains parked with its own manual QA.
