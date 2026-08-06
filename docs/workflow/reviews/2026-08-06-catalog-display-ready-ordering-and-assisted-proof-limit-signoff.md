# Signoff: Catalog mats, ready-approval ordering, and Assisted proof 80 MB

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-plan.md` |
| Review | Formal: `docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-review.md`; Impl: `...-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-test-report.md` |
| Commits | Mats/ordering `42f7b20`; proof 80 MB `982855c`; dev-deploy record `59b52a0` |
| Branch / PR | `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**) |
| Final status | **approved** |

---

## Summary

Combined follow-up covering:

1. Studio Design Details thumbnail + lightbox `artworkBackgroundHex` mats (already signed in a prior note; re-verified in this QA).
2. Portal/Studio most-recently-approved (`readyAt`) ordering (already signed; re-verified).
3. Staff Assisted Creation proof max raised from 25 MB to **80 MB**, with inclusive Storage Rules alignment.

Owner QA: **PASS** (2026-08-06).

Dev deploy to `fresh-prints-dev` (owner-approved): Storage Rules + `staffAddAssistedCreationProof` + `staffAddAssistedCreationFinalSource` + `customerAddAssistedApprovedProofToPrintRequest`.

Does **not** reopen Amendment 9 P0. Snapshot-publication amplification (P4) remains a separate production-promotion blocker. **No production deploy. PR #40 unmerged.**

---

## Changes Delivered

### Behavior
- Details mat surfaces match Design Library cards
- Ready catalog browse/category/tag: `readyAt desc` (+ completeness)
- `ASSISTED_CREATION_MAX_PROOF_BYTES = 80 MiB`; Studio copy “80 MB”; Rules `<= 80 * 1024 * 1024`
- Reference-image and other upload limits unchanged

### Dev deploy (`fresh-prints-dev`)
- Record: `docs/workflow/reviews/2026-08-06-assisted-creation-proof-80mb-dev-deploy.md`

---

## Tests

### Automated
- Focused proof/Rules/mats/ordering suites: pass
- Studio tsc, ESLint, `git diff --check`: exit 0

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Catalog mats + ready order + proof 80 MB | **PASS** | owner (2026-08-06) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Dev Storage + Assisted Functions deploy | obtained | 2026-08-06 | `APPROVE DEV DEPLOYMENT: ASSISTED CREATION PROOF 80 MB LIMIT` |
| Production deploy | not authorized | — | |
| PR #40 merge | not authorized | — | |

---

## Risks & Known Issues

| Item | Severity | Follow-up |
|------|----------|-----------|
| Generated search publisher order still `createdAt` | Medium | Later snapshot task |
| Snapshot-publication read amplification | High for prod promotion | Amendment 9 P4 |
| Production still on prior 25 MB Rules/Functions | — | Explicit prod deploy when authorized |

---

## Deferred Items

- Amendment 9 P4; Phase 1B; PR merge; production Firebase deploy

---

## Open Blockers

- [x] Owner QA — **cleared** (PASS)
- [ ] Snapshot P4 / production promotion — **remains** (out of this Signoff)
- [ ] PR #40 merge — **not authorized**

---

## Verdict

**approved**

Owner PASS after mats/ordering + 80 MB proof (with `fresh-prints-dev` Storage/Functions live). Production and PR merge remain blocked pending separate authorization.

---

## Workflow Complete

- [x] `state.md` / `CURRENT-STATE.md` / `13-recent-completed-work.md` / `ROADMAP.md` updated

**Recommended next:** Amendment 9 P4 planning before production promotion; keep PR #40 open until then.
