# Signoff: Studio Delete First-Action Latency (+ amendments)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-02-studio-delete-first-action-latency-plan.md` |
| Amendments | purge warmup; show production recovery impact-preview latency |
| Review | `docs/workflow/reviews/2026-09-02-studio-delete-first-action-latency-review.md` (+ implementation / purge reviews) |
| Test report | `docs/workflow/reviews/2026-09-02-studio-delete-first-action-latency-test-report.md` (+ purge amendment report) |
| Deploy records | deletion 11 Functions; recovery 2 Functions — `fresh-prints-dev` only |
| Final status | **approved** |

---

## Summary

Reduced Studio first-action Gen2 cold-start latency for contextual safe-deletion (and related) surfaces via same-service `{ warmup: true }` paths, post-auth idle warmup of high-frequency preview callables, dialog-open mutate warmup, print-request preview read parallelization, and upcoming-show mutate recheck reduction. Amendment covered Design Library permanent image purge. Separate owner-reported Mark as Fulfilled impact-preview flicker (schedule-clock `useEffect` re-fetch) and recovery callable warmup also delivered and DEV-deployed. Owner QA **PASS** for delete latency and recovery impact preview. **Production not authorized.**

---

## Changes Delivered

### Behavior

- Staff/owner Studio sessions warm deletion preview (and selected single-callable) Gen2 services after auth idle; delete/purge dialogs warm mutate services in parallel with real preview.
- Deletion callables accept `{ warmup: true }` after Auth + role assert with no entity reads/writes.
- Print-request preview independent Firestore reads parallelized; upcoming-show mutate uses one TOCTOU recheck.
- Design Library soft archive unchanged (client Firestore); permanent purge warmed.
- Show production recovery: impact preview no longer re-fetches on schedule clock; preview/apply support same-service warmup; staff idle warms preview; dialog warms apply.

### Documentation Updated

- Plans, reviews, test reports, DEV deploy records under `docs/workflow/`
- `docs/architecture/BACKEND.md` (warmup pattern notes from implementation)
- This signoff; `ROADMAP.md`; workflow state

---

## Tests

### Automated

- Warmup / deletion / recovery contract tests (`npx tsx --test` …) — pass (including recovery amendment updates)
- Prior phase test reports: `passed_with_notes` (documented scope)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Delete first-action latency matrix (Print Request, Show, Gang Sheet, AI Review delete, Library purge, Customer Upload, blocked, warm repeat) | **PASS** | Owner |
| Mark as Fulfilled / recovery impact preview (no flicker + warmup after DEV deploy) | **PASS** | Owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not required / not authorized** | 2026-09-02 | DEV only |
| DEV Functions deploy (11 deletion) | obtained | 2026-09-02 | `AUTHORIZE DEV DEPLOY` |
| DEV Functions deploy (2 recovery) | obtained | 2026-09-02 | `AUTHORIZE DEV DEPLOY` |
| Purge warmup amendment | obtained | 2026-09-02 | `APPROVE PURGE WARMUP AMENDMENT` |
| Database migration | N/A | | |
| Design / UX | N/A | | Owner QA covered UX latency |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |
| Owner QA | **PASS** | 2026-09-02 | Both delete latency and recovery preview |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Scale-to-zero after long idle can still cold-start | Medium | Selective `minInstances: 1` only after evidence + owner decision |
| Idle warmup count grew with recovery preview | Low | Acceptable; monitor invocation cost |
| Node 20 Functions runtime deprecation warning on deploy | Low | Separate upgrade track |

---

## Deferred Items (Roadmap)

- `show-queue-batch-allocation-performance` — **DEFERRED**
- Smart Profiling — **PARKED**
- Selective deletion `minInstances: 1` — only if needed after evidence

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner QA PASS for primary goal and recovery impact-preview amendment; automated contracts pass; DEV deploys recorded; production not in scope.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — no new lasting risk beyond known scale-to-zero note already in plan
- [x] `references/project-chatgpt-handoff/` — **absent in this checkout** (N/A)
- [x] Commit / push — **not done** (await owner direction)

**Recommended next action for user:** Commit and push when ready; promote Functions to production only via separate authorized release. FreshForge is **IDLE** for a new goal.
