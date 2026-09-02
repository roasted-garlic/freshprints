# Signoff: Studio Print Request Editing tab (+ Internal Printed group order)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Goal | `studio-print-request-editing-tab` |
| Plan | `docs/workflow/plans/2026-09-02-studio-print-request-editing-tab-plan.md` |
| Review | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-review.md` |
| Implementation review | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-test-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-owner-qa.md` |
| Final status | **approved** |
| DONE | **yes** |

---

## Summary

Studio Print Requests gained a dedicated **Editing** lifecycle tab mirrored by Wave C `queueTab: "editing"` from shared derive (`printed → printing → queued → editing → working`). Portal `/requests` also exposes Editing (Decision 5 reverse / ADR-FP-158 amendment). Internal Requests → Printed groups newest-first via shared staff gang sheet History sort. Owner QA **PASS** on DEV. ADR-FP-071 Continuable create/conflict semantics **unchanged** in this goal.

---

## Changes Delivered

### Behavior

- Persisted: `status === "editing"`; Studio mirror: `queueTab === "editing"`
- Customer tabs: Working \| Editing \| Queued \| Printing \| Printed (one line / nowrap)
- Internal tabs: Working \| Editing \| Queued \| Printed (one line / nowrap)
- Editing mutually exclusive from Working
- Portal: Editing list tab (same derive); Continuable still `draft` \| `editing`
- Internal → Printed: `printFinishedAt` DESC → missing last → cycle DESC → id
- Upcoming Shows ASC / Past Shows DESC / dedicated History helper: unchanged intents

### DEV deployment (completed earlier this goal)

| Item | Status |
|------|--------|
| DEV Functions deployed | **YES** (`fresh-prints-dev`) |
| DEV Firestore Rules deployed | **YES** (`editing` in queueTab allowlists) |
| DEV queueTab reconciliation | **COMPLETE / NO CHANGES REQUIRED** (dry-run + apply: 0 writes; mismatch 0) |
| Storage Rules | **NO CHANGE** |
| Indexes | **NONE** |
| Production | **NOT AUTHORIZED** |

**DEV Functions deployed (exact set):**

- `onPrintRequestItemQueueTabInputWritten`
- `onShowAllocationQueueTabInputWritten`
- `onPrintRequestStatusQueueTabInputWritten`
- `syncPrintRequestQueueTab`
- `backfillPrintRequestQueueTab`
- `unqueuePortalPrintRequestFromShow`
- `applyShowQueueMove`
- `applyShowProductionRecovery`
- `previewShowProductionRecovery`
- `completeStaffGangSheetAndOpenNext`

Closeout Functions tree change after deploy: **comment-only** — no redeploy for closeout.

### Documentation Updated

- Plan, Formal Review, Implementation Review, Test Report, Owner QA, this Signoff
- `DATA_MODEL.md`, `DECISIONS.md` (ADR-FP-158), `ROADMAP.md`
- DEV tooling: `functions/scripts/backfill-print-request-queue-tab-editing-dev.ts`, `verify-editing-queuetab-dev.ts` (retained per repo scripts convention)

---

## Tests

### Automated

- Final focused suite: **147 / 147 PASS**
- Functions build: **PASS**
- Studio / Portal typecheck: pre-existing unrelated errors only

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner QA DEV (Studio Customer + Internal Editing tabs + Internal Printed sort) | **PASS** | Owner |
| Production QA | N/A | not authorized |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not obtained** | 2026-09-02 | NOT AUTHORIZED |
| Database migration | N/A | | none |
| Design / UX | Owner QA PASS | 2026-09-02 | DEV Studio surfaces |
| Business / policy | obtained (Decision 5 reverse) | 2026-09-02 | Portal Editing tab |
| Secrets / env | N/A | | |

---

## Production inventory (future coordinated promotion)

| Area | Impact |
|------|--------|
| Shared | Editing `queueTab` derive; Portal Editing tabs; History sort helper reuse |
| Studio | Editing tabs, nowrap layout, counts/search, Internal Printed group order |
| Portal | Editing list tab + related copy/CSS (hosting promote) |
| Functions | Same runtime set whose bundles include changed queueTab derive (list above) |
| Firestore Rules | `"editing"` in `isValidPrintRequestQueueTab` / optional list-tab allowlists |
| Reconciliation | Production backfill **after** code/rules deploy — **NOT RUN NOW** |
| Indexes | none expected |
| Storage Rules | none |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production still on pre-Editing derive | medium | Coordinated promote + Rules + backfill |
| Continuable conflict still blocks unqueue when draft exists | product | Queued next: `portal-editing-request-parks-current-draft` |

---

## Deferred Items (Roadmap)

- `portal-editing-request-parks-current-draft` (queued next — do not auto-start)
- Cross-app lightbox Previous/Next (after parking goal)
- `show-queue-batch-allocation-performance` **DEFERRED**
- Smart Profiling **PARKED**

---

## Open Blockers

- [x] None for this goal closeout

---

## Verdict

**approved** — Owner QA PASS; final regression 147/147; DEV deploy/reconcile already complete; production not authorized.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` → IDLE / `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Start managed goal `portal-editing-request-parks-current-draft` when ready (explicit command only).
