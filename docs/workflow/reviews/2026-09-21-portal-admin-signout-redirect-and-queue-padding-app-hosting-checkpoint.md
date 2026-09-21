# Checkpoint: Production App Hosting rollout — admin sign-out + Show Queue padding

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Managed goal | `portal-admin-signout-redirect-and-queue-padding` |
| Authorization | Owner merged PR #107 and ordered Portal-only App Hosting rollout for SHA `6f705360…` (this session) |
| Production source SHA | `6f7053600e352db871c7e2d48f6012a147b5fce3` |
| Status | **SUPERSEDED** — owner created rollout; see production rollout record (`build-2026-09-21-002` LIVE) |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `origin/production` | `6f7053600e352db871c7e2d48f6012a147b5fce3` |
| Commit message | `Merge pull request #107 from roasted-garlic/development` |
| PR | **#107 MERGED** — https://github.com/roasted-garlic/freshprints/pull/107 |
| Live backend (pre-rollout) | `fresh-prints-portal` / `fresh-prints-prod` |
| Live Updated Date | `2026-09-21 11:10:04` |
| Current live / **rollback** | **`fresh-prints-portal-build-2026-09-21-001`** @ `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` (prior coordinated rollout) |
| Scope | Portal App Hosting **only** — no Functions / Rules / Storage / indexes / Studio / secrets / IAM / migrations |

---

## Exact command (do not change SHA)

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 6f7053600e352db871c7e2d48f6012a147b5fce3 --force --non-interactive
```

Agent attempts (this session): **denied** by FreshForge shell guard:

> FreshForge blocked a production or unscoped App Hosting rollout. Production rollout requires owner authorization.

`request_smart_mode_approval` retry: still denied.

---

## Owner next step

1. Approve that command in Cursor Hooks, **or** run it in a local terminal.
2. Reply **Continue Workflow** (or “rollout created”) when create succeeds.

Then the agent will: wait for READY / 100% traffic, smoke hosted + `myprintrequest.com`, check no DEV markers, document build ID + rollback, and close FreshForge.

---

## Smoke checklist (after live)

| Check | Expected |
|-------|----------|
| Hosted `/` and `/admin/show-queue` | HTTP 200 |
| `https://myprintrequest.com/` and `/admin/show-queue` | HTTP 200 |
| HTML | no `fresh-prints-dev` markers |
| Admin Sign out | lands on Login (not stuck “Redirecting to staff sign-in…”) |
| Show Queue bottom | visible space below last card |
| Traffic | 100% on new build |
| Rollback preserved | `fresh-prints-portal-build-2026-09-21-001` |
