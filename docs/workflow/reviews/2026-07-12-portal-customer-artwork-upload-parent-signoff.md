# Signoff: Portal Customer Artwork Upload (Parent Feature)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Signoff by | Signoff Agent |
| Parent plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Parent review | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-review.md` |
| ADR | ADR-FP-073 (uploads); ADR-FP-074 (library permission); ADR-FP-075 (200 DPI save floor) |
| Environment | `fresh-prints-dev` only |
| Final status | **approved_with_notes** |

---

## Summary

Parent goal `portal-customer-artwork-upload` is complete on `fresh-prints-dev`. Portal customers can upload transparent PNG/WebP artwork for their one working print request; Studio staff intake (Customer Uploads) can exclude or promote to AI Review without breaking request-backed artwork. Sub-phases A–G plus remediations r2–r7 are closed. Owner final manual gate: **PASS** on r7 (2026-07-12).

This is **not** Phase 9 Custom Request Q&A. Production deploy remains a separate human checkpoint. Always-in-selection / persistent Current Request redesign is deferred to the next managed goal `portal-persistent-current-request`.

---

## Sub-phase / remediation rollup

| Slice | Status |
|-------|--------|
| A — shared contracts | signed off |
| B — trusted backend + rules | signed off (smoke 15/15) |
| C — Portal upload UI | signed off (smoke 13/13) |
| D — show/export source compatibility | signed off (smoke 7/7) |
| E — Studio Customer Uploads intake | signed off (smoke 16/16) |
| F — promote → AI → catalog isolation | signed off |
| G — cleanup / wipe target / hardening | signed off (smoke 6/6 + owner PASS via remediations) |
| Manual E2E remediation + r2–r7 | signed off; r7 owner **PASS** |

---

## Behavior delivered (product)

- Trusted customer upload pipeline (batch, finalize, ZIP, retry, confirm+attach)
- Ownership acknowledgement required; optional Design Library permission (default on)
- Upload-backed `printRequestItem` with `sourceType: customer_upload`
- Studio Customer Uploads intake; exclude preserves request art; promote → AI Review optional
- Limits/concurrency/DPI floor/PNG fast-path as of r7
- Abandoned cleanup callable + customerUploads wipe target (dev only)

---

## Manual tests (parent gate)

| Test | Result | Approved by |
|------|--------|-------------|
| Sub-phase G E2E (initial) | FAIL → remediations | owner |
| Remediation checkpoints through r6 | PASS / approved | owner |
| r7 limits / confirmations / DPI / fast-path | **PASS** | owner (2026-07-12) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Explicitly out of scope |
| Design / UX (final) | obtained | 2026-07-12 | Owner PASS |
| Business / policy | obtained | | ADR-FP-073/074/075 |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Selection-mode Portal UX friction | medium | Next goal: `portal-persistent-current-request` |
| Production App Hosting not live | medium | Separate deploy checkpoint |
| Cloud processing slower than Studio local | low | Accepted; PNG fast-path helps |

---

## Deferred Items (Roadmap)

- `portal-persistent-current-request` — cart-style persistent Current Request
- Phase 9 Custom Requests
- Production Portal deploy
- Full parked wipe track (beyond customerUploads target)

---

## Open Blockers

- [x] None for this parent goal

---

## Verdict

**approved_with_notes** — feature complete on `fresh-prints-dev`; deferred UX redesign and production deploy noted.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` — parent goal DONE, then new goal started in same session
- [x] `ROADMAP.md` — Phase 8 fast-follow customer artwork marked complete
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action:** Managed Phase `portal-persistent-current-request` (Plan → Review before implement).
