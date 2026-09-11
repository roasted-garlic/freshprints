# Review: Customer upload Studio deferral, personal library, Portal inline remove

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-11-customer-upload-studio-deferral-personal-library-portal-inline-remove-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Owner product choices are coherent and fix the conflict between the prior child’s immediate Denied Studio tab and the real rule: **no Studio Uploaded Designs visibility until Add to Show**. Keeping full-size Storage on finalize/attach is the right engineering call. A1/B1 correctly protect gangsheet/export. Sequencing **D → R → C1 → C2** in one program child matches “soon, not hold off” without blocking freeze on the largest Portal UX slice if capacity forces a soft stop after D+R+C1.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Out-of-scope explicit (no delayed Storage; donate unchanged by default) |
| Architecture alignment | pass | Visibility gate + retention preferred over rewrite of upload pipeline |
| Security | pass | B1 blockers retained; customer-scoped personal library |
| Data model | pass with changes | Implement must pick one trusted show-submitted signal and document clocks |
| Backend | pass | Queue/allocate + retention predicates |
| UI/UX | pass | Studio lists; Portal inline remove; C2 dual tabs |
| Test strategy | pass | Contracts + Owner DEV QA per slice |
| Prior child conflict | pass with changes | Prior Denied-on-attach Studio visibility superseded; prior Signoff must not claim that behavior as final |

---

## Required changes (before / during Implement)

1. **Default open questions** if owner does not reply: staff Excluded retention **14 days**; donate Pending **unchanged**; C stays in this child sequenced after D+R.
2. **Prior child Signoff:** do not approve freeze on the prior corrective until Workstream D is implemented and Owner DEV QA PASSes for pre-show Studio emptiness (Pending + Denied). Prior deployment may remain in DEV; product truth moves to this plan.
3. **Portal inline remove:** apply on print request detail item cards; if Current Request drawer uses the same card/`onRemove`→modal path, fix that path too so behavior is one pattern.
4. **C2 copy:** state clearly that Design Library tab is **promoted/catalog** designs, not mere Allow consent. **Owner 2026-09-11:** implement C2 by reusing dashboard **Your designs** (personal vs library tabs) — no brand-new gallery section.
5. **Workstream A (owner additive 2026-09-11):** defer Staff Inbox audible/toast for queue-add until after success settle (callable return + capacity celebration); suppress local Studio Add-to-Show in-flight groups until that modal completes. Owner accepted Formal Review including this additive scope.
6. **DEV Functions redeploy (owner 2026-09-11):** pause after D/A/R polish; redeploy hold/release Functions to `fresh-prints-dev`, then continue C1 → C2.

---

## Risks acknowledged

- DEV may still show legacy pre-show Denied rows until the new gate filters them.
- C2 is larger than D+R; ship C1 retention even if C2 needs a short visual follow-up inside the same child.
- Settle delay must stay long enough for celebration without feeling “late” for remote staff listening to Portal queues.

---

## Verdict

**approved_with_changes** — owner acceptance recorded 2026-09-11 (including Workstream A). Implement → Test authorized. Production remains forbidden.
