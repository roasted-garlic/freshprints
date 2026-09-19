# Signoff: Studio Staff Artwork → AI Review corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-19 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` |
| Review | `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-formal-review.md`; amendment review; runtime root-cause review |
| Test report | `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-test-report.md`; `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-runtime-root-cause-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Corrected the Staff Library → AI Processing → Design Library title path so Staff-originated Designs receive and keep the accepted AI title as canonical `designs.title`. Owner DEV QA **PASS** on `fresh-prints-dev` after the runtime root-cause amendment was deployed.

Important history preserved: an earlier local corrective reported **119/119** automated tests while live DEV still failed because (1) Cloud Functions had not been deployed and (2) autonomous `resolveFinalCatalogCopy` trusted mis-stamped `catalogTitleSource: "staff"` hex titles, allowing `finalCatalogFields` to restore the Staff short ID. That false confidence is a documented lesson, not erased.

---

## Changes Delivered

### Behavior
- Staff-origin placeholder titles (including old `staff` stamps) yield to structurally valid AI titles at enrichment success.
- Autonomous catalog finalization no longer restores the Staff short ID over the AI title for placeholder roots.
- Staff Artwork promotion carries title provenance and `importSourceFileName`; create/edit stamp authority correctly.
- Studio: **Send to AI** wording, bounded Staff Artwork pagination, persistent AI Review sort and Processing Auto advance.
- Explicit human-authored Staff titles remain protected.
- Reconciliation tooling remains DEV-only, read-only; no apply/backfill authorized.

### Files Created
- `functions/src/staffArtworkPromotion.ts` (+ tests)
- `functions/src/ai/staffArtworkCanonicalTitleLifecycle.test.ts`
- `functions/scripts/staff-artwork-promotion-reconciliation-dev.mjs` (+ guard)
- AI Review preference utils/tests and Staff Artwork list hook
- Workflow plan/review/test/signoff artifacts for 2026-09-19

### Files Modified
- `functions/src/ai/finalCatalogCopy.ts`, `aiEnrichmentPipeline.ts`, related contracts
- `functions/src/staffArtwork.ts`
- Studio Staff Artwork + AI Review surfaces
- Shared Staff Artwork types / deletion eligibility copy
- `firestore.indexes.json` — Staff Artwork `__name__` tie-breakers only
- Durable docs (`DATA_MODEL`, `FIREBASE`, `WORKFLOWS`, `DECISIONS`)

### Documentation Updated
- Plan amendments documenting proven root-cause Q1–Q8
- Runtime root-cause review and test report
- This signoff; workflow state; ChatGPT handoff current state

---

## Tests

### Automated
- Focused title/lifecycle/contract suite after runtime amendment: **55/55** (plus prior broader 119/119 local history documented)
- Functions build: passed
- DEV Functions deploy of enrichment/promotion/reprocess: passed
- Live DEV Firestore inventory: read-only; zero reconciliation writes

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — Staff Library → AI → canonical title → Design Library | **PASS** | Owner |
| Production smoke (Staff → AI → Library → Portal) | **pending** | Owner (after promotion) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | obtained | 2026-09-19 | Owner authorized production promotion after DEV QA PASS |
| Studio release | obtained | 2026-09-19 | Authorized for approved Studio client deliverables in this goal |
| Database migration | not required | | No bulk repair; reconciliation remain read-only |
| Design / UX | obtained via DEV QA | 2026-09-19 | Title behavior verified in DEV |
| Business / policy | N/A | | |
| Secrets / env | not required | | No new secrets |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Prior automated PASS without deployed Functions | High (historical) | Documented; DEV deploy + Owner DEV QA required before production |
| Legacy Ready Designs with short titles | Medium | Self-heal on AI reprocess; bulk reconciliation unauthorized |
| Studio draft publish gate | Low | Established `APPROVE STUDIO PUBLISH` after dual-platform smoke if policy requires |

---

## Deferred Items (Roadmap)
- Owner-authorized legacy reconciliation apply (DEV first, then prod if ever approved)
- Unrelated customer-upload intake selection and portal-halftone index work left uncommitted

---

## Open Blockers
- [x] None for Signoff of the DEV corrective
- Production promotion / machine verification / owner production smoke remain as the closeout path

---

## Verdict

**approved_with_notes** — Owner DEV QA PASS recorded; production promotion and Studio release proceed under owner authorization in the production-closeout prompt. Reconciliation/backfill remain unauthorized. Final production smoke is owner-only after machine verification.

---

## Workflow Complete
- [ ] `.cursor/workflow/state.md` updated (production closeout in progress; DONE after machine verify + smoke handoff)
- [ ] `ROADMAP.md` updated if needed
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [ ] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated during closeout
- [x] Runtime root-cause history preserved

**Recommended next action for user:** Await production closeout machine verification, then run the short production smoke checklist.
