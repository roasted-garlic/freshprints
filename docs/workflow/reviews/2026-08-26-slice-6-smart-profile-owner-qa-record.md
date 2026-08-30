# Slice 6 Smart Profile — Owner Manual QA Record

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Environment | Local Studio (`npm run dev:studio`) + `fresh-prints-dev` callables |
| Designs | Canary trio (post–Slice 6 canary + corrective DEV deploy) |
| Result | **PASS WITH NOTES** |

## PASS

- Smart Catalog Profile visibility works
- Current v30/v4 indicator works on all three canary designs
- All 11 Smart Profile dimensions visible
- Automation / provenance visible in Design Details and Audit & Technical Details
- Smart Profile editing persists successfully (backend + callable confirmed)
- Profiles materially better for discovery than legacy tags alone
- Owner considers **all three canary profiles acceptable** for unattended auto-approval **quality**, including Jimothy/raccoon (`6x2LyTvG3ewIePeWHanV`)

## Owner autonomy calibration note (evidence only — Autonomous remains OFF)

Owner would allow these three designs to auto-approve **provided** root catalog fields remain part of customer discovery/search:

- category
- title
- description

…in addition to Smart Profile search intelligence.

**Not authorization to enable Autonomous.**

## Defect (Studio UX — follow-up corrective)

**Reproduction:**

1. Open Ready design → Design Details
2. Edit Smart Profile dimension → Save (value shows immediately)
3. Close Design Details
4. Reopen same design **without leaving Design Library**
5. **Stale** dimension in Details + Edit modal
6. Navigate away and return → correct value appears

**Conclusion:** Persistence OK; local Design Library / selected-design reconciliation gap.

## Reset to AI note

Canary designs lack `smartProfileAiSnapshot` (processed before snapshot deploy). Reset unavailable — expected; not a QA failure.

## Jimothy automation calibration (`6x2LyTvG3ewIePeWHanV`)

| Lens | Verdict |
|------|---------|
| Owner quality | Acceptable for auto-approval |
| System automation | `needs_review` — verifier unresolved, hard-block signals |
| Reason codes | `subject_specificity_risk:raccoon`, structured evidence gaps (cityscape, trees) |

**Classification:** Owner-accepted automation **false-negative / over-conservative** candidate for future calibration. **No threshold change in this follow-up.**
