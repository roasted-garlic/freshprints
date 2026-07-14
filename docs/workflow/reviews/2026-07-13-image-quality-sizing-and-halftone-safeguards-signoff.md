# Signoff: Image quality sizing and halftone safeguards

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Signoff by | Signoff Agent |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Plans | `docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-plan.md`, remediation / remove-detector / upscale-6x plans |
| Reviews | initial + remediation + remove-detector + `2026-07-13-image-quality-sizing-and-halftone-safeguards-upscale-6x-review.md` |
| Test report | `docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-upscale-6x-test-report.md` (final) |
| Final status | **approved_with_notes** |

---

## Summary

Delivered ADR-FP-080 pixel-based image quality sizing and human-only halftone confirmation across Studio import, Portal uploads/donations, Cloud Functions finalize, intake, and AI Review.

Final remediations under this goal:

1. **Sizing:** one-pass automated upscale toward **12″**, **10″** request default, **15″ × 16.5″** envelopes, **200 DPI** request floor; upscale ceiling raised to **6×** with **extended** staff visibility above **2×** (Achy Breaky regression).
2. **Halftone:** automatic pixel detection removed by owner decision; Portal optional checkbox; Studio/AI Review staff toggle authoritative; canonical tag sync on approve; no detector classifier.

---

## Changes Delivered

### Behavior

- Shared `image-quality-v2` policy: ≤6× one pass, never past aspect-locked 12″ target, never downsample; `EXTENDED_UPSCALE` / soft-quality when factor > 2× (non-blocking).
- Portal optional “This artwork is a halftone design.” control; customer evidence only.
- Studio import: no halftone interrupt; intake/AI Review green Halftone toggle; explicit false persists; AI never auto-enables.
- Compact Portal/Studio UI remediations retained (checkbox layout, Technical Details, create-request redirect).

### Documentation Updated

- `docs/project/DECISIONS.md` (ADR-FP-080)
- `docs/architecture/DATA_MODEL.md`, `ARCHITECTURE.md`, `BACKEND.md`
- Workflow plans/reviews/manual checkpoint/test reports under `docs/workflow/`

---

## Tests

### Automated

- Shared sizing + print math + halftone review-state: **49 pass**
- Studio Electron upscale: **4 pass**
- AI Review form (human-only halftone): **5 pass**
- Functions build: **pass**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Final 6× / Achy Breaky / human-only halftone checkpoint | **PASS WITH NOTES** | owner (2026-07-13) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-13 | Explicitly out of scope |
| Database migration | not required | 2026-07-13 | Historical detector fields left unread; no destructive migration |
| Design / UX | obtained | 2026-07-13 | Portal/Studio UI remediations accepted through checkpoint |
| Business / policy | obtained | 2026-07-13 | 6× ceiling + human-only halftone owner decisions |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Unrelated bug found during manual test | unknown | Owner will address in a separate task; not part of this goal |
| Shared-env Functions must include 6× build for Portal finalize | low | Redeploy to `fresh-prints-dev` when testing against that backend |
| Production deploy still pending | medium | Separate human checkpoint / `safe-deployment` |

---

## Deferred Items (Roadmap)

- Unrelated bug discovered at signoff (owner-owned, separate workflow)
- Production Portal/Functions deploy of ADR-FP-080 changes

---

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved_with_notes** — Manual PASS WITH NOTES confirms sizing, 6× one-pass upscale, approved max, extended-upscale warning, and human-only halftone. Unrelated bug deferred outside this managed goal.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — N/A (unrelated bug not elevated here)
- [x] `references/project-chatgpt-handoff/` — not present in repo; skipped

**Recommended next action for user:** Open a separate managed goal for the unrelated bug found during this checkpoint, or pick the next roadmap item (Phase 9 planning, production Portal deploy, or monorepo normalization).
