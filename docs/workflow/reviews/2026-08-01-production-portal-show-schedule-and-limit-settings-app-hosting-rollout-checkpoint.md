# Production Portal App Hosting Rollout Checkpoint: Customer schedule and dual limits

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Source commit | `11960852f45f948e37a1a5aeb3b09699882cd1fd` |
| Project / backend | `fresh-prints-prod` / `fresh-prints-portal` |
| Region / app root | `us-central1` / `apps/portal` |
| Build / rollout ID | `build-2026-08-01-001` |
| Deployed revision | `fresh-prints-portal-build-2026-08-01-001` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Result | **passed; owner QA pending** |

## Pre-rollout verification

- Local and remote production matched the reviewed PR #17 merge exactly; clean tree and no later production commit.
- Backend configuration confirmed project, backend, region, root, repository, and `nodejs24` runtime.
- Backend codebase configuration contains repository/root only and no automatic rollout policy; automatic rollouts remain disabled.
- Focused schedule/status/tab/batching and dual-limit/capacity suite: exit 0, 60/60 pass.
- Portal typecheck, production build, full repository lint, and `git diff --check`: exit 0.

## Exact rollout

```text
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 11960852f45f948e37a1a5aeb3b09699882cd1fd --force
```

Result: exit 0, “Successfully created a new rollout”. Build source metadata identifies the exact approved commit. Build create time `2026-08-01T14:55:43.065133901Z`; READY update `2026-08-01T15:00:47.240132Z`; backend update `2026-08-01T15:00:47.889209Z`.

## Post-rollout verification

- Hosted root returns HTTP 200 with non-empty HTML.
- Live client chunk `/_next/static/chunks/1193-b70a4976d11fd9ef.js` contains the new schedule callable/fallback presentation code.
- Portal brand images and favicon return HTTP 200 with expected image MIME types and non-empty bodies.
- Unauthenticated, non-mutating schedule-callable probe returns HTTP 401, proving endpoint reachability and auth enforcement without accessing customer data.
- Backend remains `fresh-prints-portal`, `us-central1`, `nodejs24`, not reconciling, with repository/root-only codebase configuration; automatic rollouts remain disabled.
- No authenticated owner/customer QA is claimed.

## Owner QA checklist (pending)

### Request cards

- Check Working, Queued, Printing, Printed, Completed, and canceled/historical requests with allocations.
- One show: one formatted date/time. Multiple: earliest plus accurate `+ N more`.
- No allocation: no schedule line. Missing show: `Schedule unavailable`.
- No show name or internal IDs/metadata.

### Request details

- Check every lifecycle layout, including terminal and null-progress/historical layouts.
- Every distinct show appears once, chronologically; printed/completed retain history.
- No allocation: no section. Missing referenced show only: `Schedule unavailable`.
- No show name or internal IDs/metadata.

### Lifecycle and limits

- Add allocation → schedule appears without a new login; reassignment changes it; final removal clears it.
- Portal loads current limit settings without errors.
- Request, customer-show, and overall-capacity copy/limiting warnings remain distinct.
- Do not change production settings; linked/unlinked final QA remains pending Studio Settings rollout/save.

## Scope confirmation

No Functions, Rules, indexes, Studio, settings, data, Auth/secrets, Stage 2, DNS/domain, analytics, catalog snapshot, or release-tag action occurred. Owner QA status: **pending**.
