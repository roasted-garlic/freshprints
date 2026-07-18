# Signoff: Assisted approved proof download + Portal proof UX

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan (parent) | docs/workflow/plans/2026-07-17-assisted-approved-proof-download-plan.md |
| Plan (CORS residual) | docs/workflow/plans/2026-07-17-assisted-proof-download-cors-residual-plan.md |
| Plan (notes/overview residual) | docs/workflow/plans/2026-07-17-assisted-portal-proof-notes-overview-residual-plan.md |
| Review | docs/workflow/reviews/2026-07-17-assisted-portal-proof-notes-overview-residual-review.md |
| Test reports | docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-test-report.md; docs/workflow/reviews/2026-07-17-assisted-proof-download-cors-residual-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-assisted-portal-proof-ux-manual-qa.md; docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Customer can download approved Assisted Creation proof PNGs from Portal without Storage CORS or browser `fetch` failures. Download uses callable `customerGetAssistedCreationApprovedProofFile` (Admin → base64 → blob → save-as). Portal proof UX residuals accepted: Overview approved preview + 14-day copy, Approved labels, Notes dedupe (no Proof-ready email in Notes), Studio-like proof modal sizing. Owner **PASS** 2026-07-17. Dev-only; no production deploy.

---

## Changes Delivered

### Behavior

- Eligible approved proofs: Download PNG via callable (transparency preserved; `proof-N.png` naming).
- Portal Overview: compact approved preview + Download + 14-day retention copy.
- Portal Proofs modal: Approved chip, square contain preview, single Notes entry point, Close + Download.
- Notes: dedupe proof.note vs history; exclude Proof-ready email noise.
- Studio proof detail modal sizing/hierarchy aligned as absorbed residual.
- Prior residuals: Storage CORS / signed-URL IAM path superseded by callable file bytes for Portal download reliability.

### Files Modified (representative)

- `functions/src/customerGetAssistedCreationApprovedProofFile.ts`
- `functions/src/lib/assistedCreationApprovedProofDownload.ts`
- `functions/src/customerGetAssistedCreationApprovedProofDownloadUrl.ts` (earlier residual)
- `apps/portal/features/assisted-creation/` (panels, status, past requests, service, display utils, CSS)
- `apps/studio/.../AssistedCreationRequestsSection.tsx`, `staff-inbox.css`
- `packages/shared` assistedCreation actions/constants/retention/proof file name helpers
- Docs: BACKEND, SECURITY, DECISIONS, workflow plans/reviews/setup (CORS/IAM notes)

### Documentation Updated

- This signoff
- Manual QA PASS records
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md` + `13-recent-completed-work.md`

---

## Tests

### Automated

- Recorded in parent + CORS residual test reports (shared retention/file-name units; Functions build; Portal typecheck as applicable).

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Download PNG via callable (not Failed to fetch / not open-in-tab) | **PASS** | Owner (2026-07-17) |
| Overview 14-day + approved preview | **PASS** (absorbed) | Owner (2026-07-17) |
| Proof modal layout / Approved labels / Notes dedupe | **PASS** (absorbed) | Owner (2026-07-17) |
| Studio modal sizing | **PASS** (absorbed) | Owner (2026-07-17) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Dev Functions / Portal only |
| Database migration | not required | | Additive / existing fields |
| Design / UX | obtained | 2026-07-17 | Owner PASS this workstream |
| Business / policy | not required | | |
| Secrets / env | not required | | Callable uses existing Firebase auth |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Callable returns base64 (payload size) | low | Acceptable for proof PNGs; monitor large files |
| Production Functions not deployed | medium | Separate APPROVE for production |
| Signed-URL + TokenCreator IAM still useful for alternate paths | low | Documented in setup notes; Portal primary path is callable file |

---

## Deferred Items (Roadmap)

- ~~`assisted-terminal-messaging-closed`~~ - closed **PASS** / signed off 2026-07-17 (owner **PASS all**)
- ~~`assisted-customer-cancel-reason`~~ - closed **PASS** / signed off 2026-07-17 (owner **PASS all**)
- ~~Skeleton/Halloween optional live smoke~~ - closed by owner **PASS all** 2026-07-17
- Production push / email production release - deferred

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved_with_notes** - Owner PASS closes proof-download / Portal proof UX. Parked follow-ups later closed via owner **PASS all** (2026-07-17).

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (N/A)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Idle - parked follow-ups closed via **PASS all**; pick next managed phase when ready.
