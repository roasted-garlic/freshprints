# Signoff: Prelaunch companion/censored production promote + Studio 1.0.2

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Signoff by | Signoff Agent |
| Plan | Promote under Goal #13; Studio QA corrective `docs/workflow/plans/2026-08-10-studio-1.0.2-release-qa-corrective-plan.md` |
| Review | `docs/workflow/reviews/2026-08-10-studio-1.0.2-release-qa-corrective-review.md` |
| Test report | `docs/workflow/reviews/2026-08-10-studio-1.0.2-release-qa-corrective-test-report.md` + owner smoke |
| Final status | **approved** |

---

## Summary

Production promote of prelaunch companions, censored content, and related DEV correctives is complete. Backend (Rules, indexes, `getPortalGlobalOpenGraph`) and Portal App Hosting remain live. Studio stable **1.0.2** was published from production SHA `b6e67be1b7fe02a69cd31077a203ee9102611ca5` after a release-QA corrective (lint + fail-fast gates + draft `target_commitish` pin). Owner smoke passed with phrase `PROD COMPANION CENSORED PROMOTE SMOKE: PASS`.

---

## Changes Delivered

### Behavior
- Production Portal/Studio on `fresh-prints-prod` include companions, censored preference/content paths, Featured Tags/text censoring-related promote scope, and prior DEV correctives already in `8cc014f…` feature merge.
- Studio package **1.0.2** (version bump from already-published 1.0.1) with release workflow fail-fast and draft commit pinning.

### Files Created
- Promote/smoke and Studio QA corrective plans, reviews, diagnosis notes under `docs/workflow/`
- `scripts/promote-prelaunch-companion-censored-firebase.ps1` (helper; not required for closed state)

### Files Modified (release QA corrective)
- Lint-only unused-import cleanup in two test files
- `.github/workflows/studio-release.yml` fail-fast + `target_commitish` pin
- `docs/standards/DEPLOYMENT.md` release-gate notes
- `apps/studio/package.json` / lockfile workspace version → `1.0.2` (prior PR #53)

### Documentation Updated
- `DEPLOYMENT.md`, workflow plans/reviews, this signoff, `ROADMAP.md`, workflow state

---

## Tests

### Automated
- `npm run lint` exit 0 after unused-import fixes (Studio QA corrective)
- `studio-release.yml` Success for published `v1.0.2` (owner-run; draft target `b6e67be…`)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Post-promote smoke (`docs/workflow/reviews/2026-08-10-prelaunch-companion-censored-promote-smoke-checklist.md`) | **PASS** (`PROD COMPANION CENSORED PROMOTE SMOKE: PASS`) | owner |
| Studio 1.0.2 publish (draft then release; correct `target_commitish`) | PASS (published, not draft; `targetCommitish=b6e67be…`) | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | obtained | 2026-08-10 | `APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED`; Rules/indexes/Function/App Hosting live |
| Database migration | N/A | | |
| Design / UX | obtained via smoke | 2026-08-10 | Owner smoke PASS |
| Business / policy | N/A | | |
| Secrets / env | N/A | | no new secrets |
| Studio stable release | obtained | 2026-08-10 | `v1.0.2` published `internal-unsigned` path |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Domain cutover still deferred | medium (product) | Await `APPROVE MYPRINTREQUEST.COM CUTOVER`; Coming Soon / DNS untouched |
| Algolia prod mutation untouched | low | Intentional; typed search smoke relied on existing index |
| First 1.0.2 draft had wrong `target_commitish` / ignored lint | closed | Deleted/recreated after PR #54; published release pinned to `b6e67be…` |

---

## Deferred Items (Roadmap)
- `APPROVE MYPRINTREQUEST.COM CUTOVER` (DNS / Coming Soon / custom domain)
- Placement-default (already DEFERRED from prelaunch DEV work)

---

## Open Blockers
- [x] None for this promote scope

---

## Verdict

**approved** — Owner smoke PASS; Studio 1.0.2 live with correct production `target_commitish`; backend/Portal promote not to be repeated.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — not required (no new open risk)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md`** — **N/A** (handoff package not present in repo)
- [x] Handoff `13-recent-completed-work.md` — **N/A**

**Recommended next action for user:** Keep hosted.app as customer surface until cutover phrase; start a new managed phase only when ready for `APPROVE MYPRINTREQUEST.COM CUTOVER` or next Goal #13 work.
