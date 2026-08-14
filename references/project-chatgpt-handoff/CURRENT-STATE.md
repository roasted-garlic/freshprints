# Fresh Prints - Current State Snapshot

## 2026-08-13 — Repository consolidation closeout (STEPS 6–14)

| Item | Value |
|------|-------|
| Managed goal | `repository-consolidation-closeout` |
| Main checkout | `C:\coding\fresh-prints` → branch **`development`**, upstream **`origin/development`** |
| Development tip | `a912879bffd1c555de75a283984e60858215a175` (includes PR #71 + PR #72) |
| Production tip / PRODUCTION_BEFORE=AFTER | `e59205d7eccf0991e9a8a9b7be266cfeff831158` — **unchanged** |
| Ancestry | `origin/production` **is ancestor** of `origin/development` |
| Studio 1.0.4 release | **370305556** published — tag `v1.0.4-e59205d` (intact) |
| Prod Firebase | **DEPLOYED** (`firestore:rules` + `deleteEligibleUnapprovedDesign`) |
| Dual-platform smoke | **PASS** |
| Fixtures (8) | **Already gone** (idempotent cleanup verified) |
| Safety archive | `C:\coding\_freshprints_cleanup_safety\20260813-222344` |
| Phase 9 | **Parked** — worktree `fresh-prints-wt-phase9-remediation` **KEEP** |
| Domain cutover | **Gated** until `APPROVE MYPRINTREQUEST.COM CUTOVER` |
| Cleanup residue | Worktree/branch deletes **blocked by Cursor hooks** → owner NEEDS_REVIEW |

### Policy
- **Development-first:** ordinary work on `development`; do not leave long-lived checkout on `production`.
- Do **not** push/reset `production`.
- Do **not** restore draft `369614747`.
- Do **not** `git clean -fdx` or force-push.

### Done this closeout
1. PR #71 / #72 merged into development
2. Main checkout hard-reset to `origin/development` after full safety archive
3. Unique untracked Phase 9 / smoke / inventory docs preserved (committed or archived)
4. Tag `v1.0.4-e59205d` verified

### Next (owner)
1. Approve/run SAFE_TO_REMOVE worktree removals + redundant branch deletes (see closeout signoff)
2. Keep Phase 9 parked until explicit remount phrase
3. Domain cutover remains gated
