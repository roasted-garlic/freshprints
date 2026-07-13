# Signoff: Portal upload limits, speed, confirmations, DPI (r7)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-plan.md` |
| Review | `docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-review.md` |
| Test report | `docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-test-report.md` |
| Manual checkpoint | `docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-manual-checkpoint.md` |
| Final status | **approved** |

---

## Summary

Remediation r7 raised customer-upload capacity and parallelism, clarified ownership/library confirmations (ADR-FP-074), aligned attach sizing with the shared 10″ helper, added compact Portal DPI feedback, shipped PNG processing fast-path + granular stages, and raised the Print Request save floor to ≥ 200 effective DPI (ADR-FP-075). Deployed to `fresh-prints-dev` only. Owner manual checkpoint: **PASS** (2026-07-12).

---

## Changes Delivered

### Behavior
- Limits: 100 files/batch, 100 MB/image, 2 GB batch/ZIP, concurrency 8, daily finalize 200, create-batch 100
- Ownership acknowledgement required; Design Library permission optional, default checked
- Attach uses `resolveInitialPrintRequestItemSize`; Portal shows DPI with soft warn 200–299 and hard block below 200
- PNG fast-path skips unnecessary convert/trim/upscale; stage labels reflect work that runs
- Mid-checkpoint deploy of finalize/retry/zip + Storage rules on `fresh-prints-dev`

### Documentation Updated
- BACKEND / FIREBASE limits; ADR-FP-074; ADR-FP-075; TESTING notes as applicable

---

## Tests

### Automated
- Portal typecheck PASS; shared unit 9/9 PASS; Functions build PASS; `fresh-prints-dev` deploy PASS (see test report)
- Mid-checkpoint: sizing unit tests for 200 DPI floor PASS

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| r7 manual checkpoint (limits, confirmations, Studio library decline, DPI floor, PNG fast-path stages) | **PASS** | owner (2026-07-12) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev only |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-12 | Manual PASS |
| Business / policy | obtained | 2026-07-12 | Library permission optional; 200 DPI floor |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Cloud Functions wall-clock still slower than Studio local disk for huge PNGs | low | Accepted in plan; fast-path reduces common case |
| Always-in-selection / persistent Current Request redesign | — | Deferred to `portal-persistent-current-request` |

---

## Deferred Items (Roadmap)

- Persistent Current Request / cart-style Portal flow (`portal-persistent-current-request`)
- Production Portal deploy
- Phase 9 Custom Requests

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — automated green; owner manual PASS recorded.

---

## Workflow Complete

- [x] r7 closed; parent G/parent signoff follows in same pass
- [ ] Parent ROADMAP / CURRENT-STATE updates (same session)
