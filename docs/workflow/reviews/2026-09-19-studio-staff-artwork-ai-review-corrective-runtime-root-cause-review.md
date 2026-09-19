# Review: Studio Staff Artwork → AI Review corrective — runtime root-cause amendment

| Field | Value |
|-------|-------|
| Date | 2026-09-19 |
| Reviewer | Review Agent (Cursor/Grok corrective investigation) |
| Plan | `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Owner DEV QA failed after 119/119 automated tests because the live DEV path was never exercised by those tests. Read-only DEV evidence proves the correct AI title lives in `aiSuggestions.title` while canonical `designs.title` keeps the Staff Library short ID, under autonomous catalog mode, with Cloud Functions still serving the pre-corrective enrichment build. The amendment’s bounded code changes (final-catalog Staff-origin placeholder exception, helper filename repair, pipeline spread order, and regression tests) are approved. Implementation may proceed. DEV Functions deploy remains a separate human-authorized gate before Owner DEV QA.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Title persistence only; no reconciliation writes; no UI workarounds |
| Architecture alignment | pass | Server-side canonical `designs.title`; Component→Hook→Service preserved |
| Security impact addressed | pass | No Rules/secrets/public exposure changes |
| Data model impact addressed | pass | Existing fields only; additive semantics on authority for placeholders |
| Backend impact addressed | pass | `finalCatalogCopy`, pipeline write order; DEV deploy gated |
| Test strategy adequate | pass | Requires autonomous overwrite + staff/filename/hex regressions; DEV runtime after deploy |
| Human checkpoints identified | pass | DEV Functions deploy auth; Owner DEV QA; no Signoff/prod |
| Roadmap alignment | pass | Corrective continuation of Staff Artwork AI Review |
| Documentation plan | pass | Plan amendment records proven Q1–Q8 answers |
| No silent scope expansion | pass | Explicit non-goals retained |

---

## Architecture Review

**Findings:**
- Design Library and Portal correctly read `designs.title`. Teaching them to display `aiSuggestions.title` would be a regression; rejected.
- Dual-field UX (queue/form vs canonical title) explained the false confidence during prior QA.

**Required changes:**
- [x] None beyond the plan’s bounded server-side title correction

---

## Security Review

**Findings:**
- No Rules, Storage Rules, IAM, or secret changes in scope.
- Read-only DEV inventory used Application Default Credentials against `fresh-prints-dev` only.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Any production Functions deploy (out of scope)
- [x] DEV Functions deploy of enrichment/promotion closures (required for runtime proof; owner must authorize)

---

## Data Model Review

**Findings:**
- Mis-stamped `catalogTitleSource: "staff"` on generated hex titles is the authority poison pill under autonomy.
- Placeholder-shape detection remains the bounded signal that a `staff` stamp is not human-authored catalog authority for Staff-origin roots.

**Required changes:**
- [x] None beyond resolver semantics in the plan

---

## Backend Review

**Findings:**
- `catalogWorkflowMode: "autonomous"` + `catalogAutonomousLiveEnabled: true` on DEV makes `finalCatalogFields` the Ready title writer.
- Spreading `finalCatalogFields` after `staffArtworkTitleFields` can overwrite a correct Staff-origin AI title.
- Live Functions were not updated with the Sep 19 corrective; local helper changes could not affect DEV.

**Required changes:**
- [x] Implement resolver + spread-order fixes per plan
- [x] After Test, stop for owner-authorized bounded DEV deploy before claiming runtime success

---

## Test Review

**Findings:**
- Prior 119/119 PASS was a false runtime confidence signal.
- Lifecycle test simulated approval/Portal without executing Cloud Functions or autonomy overwrite.

**Required changes:**
- [x] Add autonomous Staff-origin placeholder overwrite regression
- [x] Flip/replace the unit expectation that hex + `staff` + filename must skip
- [x] Extend lifecycle fixture with post-corrective promotion shape (`importSourceFileName` present)

---

## Required changes before / during implement

1. Implement the three code corrections in the plan amendment (resolver, helper, spread order).
2. Add the named regressions; do not rely on simulated-only lifecycle coverage.
3. Do not treat automated PASS as Owner DEV QA.
4. Do not deploy Functions until the owner authorizes the bounded DEV allowlist.
5. Do not run reconciliation apply, production deploy, Studio release, or Signoff.

---

## Verdict rationale

**approved_with_changes** — root cause is proven from live DEV data and code path analysis; the amendment is necessary and bounded; implementation is allowed under the listed conditions.
