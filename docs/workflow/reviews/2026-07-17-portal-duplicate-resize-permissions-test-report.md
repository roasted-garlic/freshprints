# Test Report: Portal duplicate + resize permissions

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Plan | docs/workflow/plans/2026-07-17-portal-duplicate-resize-permissions-plan.md |
| Review | approved |
| Environment | local Portal against `fresh-prints-dev` (manual) |
| Automated result | **passed_with_notes** |
| Overall | **passed_with_notes** (owner manual QA **PASS** 2026-07-17; optional rules harden deploy still pending owner `APPROVE DEV DEPLOY`) |

---

## Commands

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsc --noEmit` in `apps/portal` | 0 | Portal typecheck PASS |

Rules emulator suite: **absent** in repo — not run.

---

## What was verified in code

- Autosave toast path = `updatePrintRequestItem` only (not duplicate callable).
- Optimistic `pending_dup_*` blocked from editors + service writes.
- Parent `printRequests` touch removed from item update.
- Size/qty client validation before Firestore write.
- Notes clear uses `deleteField()`.
- Rules: customer printRequest updates use `diff().affectedKeys().hasOnly(["itemCount","notes","updatedBy","updatedAt"])`; optional helpers accept null.

---

## Manual

See `docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-manual-qa.md`.

| Result | Detail |
|--------|--------|
| **PASS** | Owner 2026-07-17: “Portal duplicate/resize is fixed and PASSED.” |

---

## Deploy

| Resource | Needed? |
|----------|---------|
| Portal client | Local/`dev:portal` sufficient for retest; App Hosting only if testing hosted Portal |
| `firestore:rules` | **Yes for harden** — ask `APPROVE DEV DEPLOY` |
| Functions | **No** |

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Do **not** deploy production.
