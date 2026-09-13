# Plan Amendment Review: Catalog Processing Mode (Slice 4)

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md |
| Amendment | Owner-controlled Catalog Processing Mode (`manual` \| `shadow` \| `autonomous`) |
| Verdict | **approved** (planning amendment only) |

---

## Summary

Owner-directed plan amendment records Catalog Processing Mode as an explicit **Slice 4** deliverable: server-authoritative settings on existing `settings/aiEnrichment`, fail-safe Manual default, Studio AI Enrichment UX, active-mode visibility, typed Autonomous confirmation, Slice 5 mode honor / Slice 6 lifecycle ignore, mode-aware Automation Health, and ADR/workflow revision before live Autonomous. **No runtime implementation in this amendment.** Slice 2 DEV QA checkpoint unchanged. Slice 3 not authorized.

---

## Acceptance criteria check

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Manual / Shadow / Autonomous defined | pass — §7.1 |
| 2 | Slice 4 is implementation slice | pass — §7.1, §24 |
| 3 | Server-authoritative | pass — §7.2 |
| 4 | Fail-safe never Autonomous | pass — §7.3 → `manual` |
| 5 | Active mode visible in Studio | pass — §7.5 |
| 6 | Mode change without Functions redeploy | pass — §7.2 |
| 7 | Autonomous requires explicit confirmation | pass — §7.6 typed phrase pattern |
| 8 | Shadow same policy/verifier, no publish | pass — §7.1 / §7.7 |
| 9 | Slice 5 honors mode | pass — §12 |
| 10 | Slice 6 ready backfill ignores mode for lifecycle | pass — §13 |
| 11 | Automation Health distinguishes shadow vs real | pass — §16 |
| 12 | Staff-approval ADR/workflow identified | pass — §7.8 (DATA_MODEL + Phase 5B architecture review + ADR-FP-NEW-1) |
| 13 | Legacy tags temporary; Slice 6 retirement | pass — §13 / §15 |
| 14 | No Slice 2/3 runtime scope expansion | pass |
| 15 | Remain at Slice 2 owner DEV QA checkpoint | pass — workflow state |

---

## Repo checks resolved

| Item | Resolution |
|------|------------|
| Settings document/field | `settings/aiEnrichment` + proposed `catalogWorkflowMode` |
| Settings UI | `SettingsPage.tsx` AI Enrichment tab |
| Permissions | Current `updateAiEnrichmentSettings` = owner+admin; Slice 4 Formal Review must decide Autonomous owner-only vs keep owner+admin |
| Confirmation pattern | Typed confirmation phrases (e.g. `ENABLE AUTONOMOUS`); reuse existing phrase+callable validation pattern |
| Staff-approval doctrine | DATA_MODEL AI pipeline + `phase-5-ai-review-architecture-review.md` |

**Still deferred to Slice 4 Formal Review (not blockers for this amendment):**

- Exact AI Review badge component path
- Final typed phrase string
- Whether Autonomous enablement is owner-only
- Environment-specific gate that keeps deployed `autonomous` from publishing until ADR+owner live checkpoint

---

## Scope / safety

- [x] Docs/planning only — no Functions, Firestore, Studio runtime, Algolia, deploy
- [x] Does not authorize live Autonomous publication
- [x] Does not begin Slice 3 or sign off Slice 2
- [x] Does not alter owner DEV QA checkpoint actions

---

## Verdict

**approved** — amend master plan; proceed with Slice 2 DEV QA as previously gated. Full Slice 4 Formal Review remains required before Catalog Processing Mode implementation.

---

## Next Step

**STOP** — owner continues Slice 2 DEV QA retest. Do not implement Catalog Processing Mode. Do not start Slice 3.
