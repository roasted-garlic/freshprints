# Production Git merge record — PR #85 Studio polish

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `promote-studio-updater-design-id-search-tag-picker-polish-to-production` |
| PR | https://github.com/roasted-garlic/freshprints/pull/85 |
| Merge SHA | `97d6d49dd5e2c8cad64ae38b9f883334f56e2f76` |
| Status | **MERGED** — Git only |

---

## What landed on `production`

Signed-off Studio polish (`445ab13` + `82acfad`): Updates overlay portal/width, Design Library full-ID search, Load more hidden on short pages, tag picker close-after-select.

## What did not happen

- No App Hosting rollout (live remains `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a`)
- No Function / index / Rules deploy
- No Studio version bump or `studio-release.yml` dispatch
- Published Studio remains **1.0.7**

## Rollback

Restore Git `production` to `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` via revert of this merge. Never force-push `production`.
