# Review: AI analysis background on preview (reprocess + persist)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-ai-analysis-background-preview-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly separates default auto-processing (keep `#808080` when unset) from a staff-chosen, persisted `artworkBackgroundHex` that drives both the preview mat and AI compositing when set. Top-right preview control matches owner preference; reusing the existing field satisfies “carry to Review → Library if unchanged” without a second color system. Reset-for-processing already leaves `artworkBackgroundHex` intact.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Overlay + prepare/pipeline + docs; no dual field |
| Architecture alignment | pass | Services write design field; Functions prep reads it |
| Security impact addressed | pass | Hex normalize server-side; staff gates unchanged |
| Data model impact addressed | pass | Document existing field’s AI use; no migration |
| Backend impact addressed | pass | Enrichment prepare path; soft-deploy gated |
| Test strategy adequate | pass | Default-unset AI canvas regression + manual reprocess |
| Human checkpoints identified | pass | Soft-deploy manual QA; white preset noted |
| Roadmap alignment | pass | AI Review / enrichment maintenance |
| Documentation plan | pass | DATA_MODEL + ADR |
| No silent scope expansion | pass | Parks title + brand-logo; out-of-scope clear |

---

## Architecture Review

**Findings:**
- Single field for display + AI when set is the right tradeoff given owner persistence requirement.
- Unset → `#808080` for AI vs unset → `#e5e7eb` for display is intentional and must stay tested.
- Overlay must sync with Needs Review draft/`ArtworkBackgroundFields` to avoid split-brain.

**Required changes:**
- [ ] None

---

## Security Review

**Findings:**
- Validate hex before sharp compositing; do not accept arbitrary strings into image pipeline.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] Production Functions deploy (out of scope)

---

## Data Model Review

**Findings:**
- No new fields; DATA_MODEL clarification only.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `resetAiEnrichmentForProcessing` does not delete `artworkBackgroundHex` — good for reprocess.
- Prefer design-doc source of truth over enqueue-only override unless a save race appears in implement.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Must assert unset design → analysis `#808080` unchanged.
- Must assert set hex → prepare uses that RGB.
- Manual: overlay + form sync + Library persistence.

**Required changes:**
- [ ] None beyond plan

---

## Documentation Review

**Findings:**
- ADR + DATA_MODEL note sufficient.

---

## Required Changes (if approved_with_changes)

None. White preset as a shared option is accepted as planned (owner may drop during implement if UX feels noisy).

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner placement and persistence decisions are recorded; technical approach is minimal, reuses existing persistence, and preserves auto-processing defaults.

---

## Next Step

Implement approved scope after owner says to proceed (or `APPROVE IMPLEMENTATION`). Title-completeness manual QA remains parked.
