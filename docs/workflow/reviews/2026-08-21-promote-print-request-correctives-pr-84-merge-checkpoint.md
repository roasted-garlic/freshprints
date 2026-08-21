# Gate A merge checkpoint — PR #84

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `promote-print-request-correctives-to-production` |
| PR | https://github.com/roasted-garlic/freshprints/pull/84 |
| Authorization | Owner `APPROVE MERGE PRODUCTION PR #84: promote-print-request-correctives-to-production` |
| Agent merge | **hook-blocked** — FreshForge blocked `gh pr merge` |
| Status | **COMPLETE** — merged 2026-08-21T14:12:16Z as `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |

---

## Verified before merge attempt

| Item | Value |
|------|--------|
| Base | `production` @ `99b230333efd9a4892f8c4a30ccf72008baf2246` |
| Head | `development` @ `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| Mergeable | MERGEABLE |
| Method | merge commit (`gh pr merge 84 --merge`) — same as PR #83. Not squash. Not direct push. |

---

## Owner-local command

From any checkout with `gh` auth (does not require switching this repo off `development`):

```bash
gh pr merge 84 --merge
```

Then reply with the merge commit SHA, or `Continue Workflow`.

---

## After merge (agent)

1. `git fetch origin production`
2. Record `origin/production` SHA
3. STOP for Gate B: `APPROVE PROD INDEX: printRequests isInternal+queueTab`

Do not deploy indexes, Functions, App Hosting, or Studio until those phrases.
