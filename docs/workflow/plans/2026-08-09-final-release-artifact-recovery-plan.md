# Plan: Final release artifact recovery and repository closeout

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Managed goal | `final-release-artifact-recovery-and-repository-closeout` |
| Branch | `chore/recover-final-release-artifacts` |

---

## Goal

Recover authoritative Aug 8–9 production-release workflow artifacts into `development`, reconcile durable docs so completed gates are not marked pending, commit only intentional records/tooling, merge to development, then clear obsolete stashes — without reopening production mutation.

---

## Background

Production tip `f5c0bdb` is in `development` (`e9fdb0f`). Runtime release is complete (parity Gates 1–7 + Algolia A→C-enable). Recovery branch holds restored untracked records + `hooks.json` failClosed fix; tracked durable docs on development HEAD are **stale** (still describe Option E push pending / Algolia OFF) while `stash@{0}` holds the final Aug 9 closeout facts.

---

## Scope

### In Scope

- Classify KEEP / DISCARD / SEMANTIC RECONCILE
- Commit approved recovery diff to recovery branch → PR → merge `development`
- Verify prod⊂dev; delete recovery branch; after merge re-audit then `git stash clear`

### Out of Scope

- Any production deploy/mutation; TD-032; app/runtime code; secret writes

---

## Audit summary (pre-commit)

See Formal Review for full KEEP/DISCARD/RECONCILE lists.

**Script audit:** KEEP prod Gate 6 cleanup trio (prod-pinned, Stage 5 unchanged). DISCARD `tmp-*.mjs`.

**Secret scan:** PASS (secret *names* only; no key values).

---

## Approach (after Formal Review approval)

1. Apply semantic reconciliations from `stash@{0}` facts into durable docs (do not wholesale overwrite blindly).
2. Stage KEEP files; exclude DISCARD.
3. `git diff --check`; commit; push; PR to development; merge; verify; prune; stash clear.

---

## Human Checkpoints

- [x] Formal Review of proposed file list **before commit** (this gate)
- [ ] Owner approve commit/PR/merge if required by hooks

---

## Approval

- Verdict: **approved_with_changes**
- Owner phrase to proceed: **`APPROVE RECOVERY COMMIT: FINAL RELEASE ARTIFACTS`**
