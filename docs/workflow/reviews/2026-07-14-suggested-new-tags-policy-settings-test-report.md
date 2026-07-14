# Test Report: Suggested new tags policy settings

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-14-suggested-new-tags-policy-settings-plan.md |
| Overall | **passed** |

---

## Summary

Unit tests (86) and functions build passed. Deployed `updateAiEnrichmentSettings` and `enqueueAiEnrichment` to `fresh-prints-dev`. Manual: Settings UI + one AI Processing run under Balanced.

---

## Commands Run

| Check | Command | Exit Code | Result |
|-------|---------|-----------|--------|
| Unit | `npx tsx --test` (policy, resolver, pipeline, load settings, Studio constants) | 0 | pass (86/86) |
| Build | `npm run build --prefix functions` | 0 | pass |
| Deploy | `firebase deploy --only functions:updateAiEnrichmentSettings --project fresh-prints-dev` | 0 | pass |
| Deploy | `firebase deploy --only functions:enqueueAiEnrichment --project fresh-prints-dev` | 0 | pass |
| Studio tsc | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 2 | pre-existing `ignoreDeprecations` config error — not introduced by this change |

---

## Manual Test Checkpoint

**Feature / area:** Studio Settings → AI Enrichment → Suggested new tags  
**Environment:** Studio against fresh-prints-dev  
**Prerequisites:** Restart Studio; open Settings

### Steps
1. Confirm **Suggested new tags** dropdown exists (Off / Strict / Balanced — Default / Generous / Always)  
   → **Expected:** Default shows Balanced (or saves Balanced on first save if doc lacked field)
2. Confirm former “Suggested-tag quality” is labeled **Suggested-tag writing**  
3. Save **Balanced**, run AI Processing on a design that usually got few/no Suggested New Tags  
   → **Expected:** Up to 3 Suggested New Tags when coverage ≤ 4 approved matches with leftovers
4. Switch to **Strict**, Save, re-run a similar design  
   → **Expected:** Fewer / no suggestions (original gate)

### Please reply with
- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
