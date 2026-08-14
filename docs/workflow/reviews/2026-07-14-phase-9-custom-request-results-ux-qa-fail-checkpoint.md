# Manual QA Checkpoint — Phase 9 Custom Request results UX FAIL

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | `phase-9-custom-requests-slice-1` (closing into remediation) |
| Environment | Portal + Studio against `fresh-prints-dev` |
| Result | **FAIL** — remediation required |
| Follow-up goal | `phase-9-custom-request-results-and-routing-remediation` |
| Follow-up plan | `docs/workflow/plans/2026-08-12-phase-9-custom-request-results-and-routing-remediation-plan.md` (revised; supersedes 2026-07-14 plan) |

---

## Owner verdict

**FAIL** against the Phase 9 recommendation-engine manual checkpoint.

Questionnaire routing to Etsy / AI / Human is reachable, but the **results experience** and **lifecycle clarity** are not acceptable for self-service. Additional product direction expands beyond polish of existing result cards.

---

## Feedback summary (authoritative)

### Lifecycle
- One-open Custom Request rule is not explained until customers hit a conflict.
- **Mark as satisfied** is inconsistent (currently `closeCustomRequest` only from `etsy_referred`).
- Cancel exists but is too visually dominant; confirmation copy/history implications need clarity.

### Results UX
- Nested bordered cards, long paragraphs, oversized buttons.
- Prior-request history list clutters the main result page.
- Etsy stops short of helping customers get a purchased PNG into a Print Request.
- Hardcoded `$1–$8` pricing claim must go.

### Recommendation quality
- AI path is too narrow (unusual-concept heavy).
- Text-heavy and reference-inspired work should often be AI when exactness/legal triggers are absent.
- Customer-facing “Human creation” implies hand-drawing; rename to **Fresh Prints Assisted Creation** (keep enum `human_creation` unless migration approved).

### Explicitly deferred (do not implement in remediation)
- Gemini generation, credits, tokens, Stripe/payment
- Proof upload / approval / revisions
- New upload pipelines or Custom Request reference reuse for purchased Etsy files
- Production deploy

---

## Screenshot themes recorded during QA

1. Cramped Etsy actions; buttons looked inert before URL/close callables
2. Long Etsy URL overflow
3. Studio detail spinner (stale load race)
4. “Already have an open request” error after Edit answers
5. Edit on cancelled request (blank form)
6. Nested result cards / heavy cancel UI / history feed under results
7. Stack overflow when editing open human recommendation (draft/answer mapping)

Earlier remediations addressed some of these; owner FAIL remains on overall results UX + routing product fit.

---

## Transition

| Slice-1 | Remediation |
|---------|-------------|
| Manual QA | **FAIL** recorded |
| Signoff | Not approved |
| Next | Plan → Review on `phase-9-custom-request-results-and-routing-remediation` |
| Implement | Blocked until plan review approval |
