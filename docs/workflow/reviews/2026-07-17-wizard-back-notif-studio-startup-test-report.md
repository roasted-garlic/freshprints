# Test Report: Wizard Back, Notifications, Studio Startup, Unread Badges, Email History

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Plan | docs/workflow/plans/2026-07-17-wizard-back-notif-studio-startup-plan.md |
| Status | **passed_with_notes** (automated pass; manual UI pending) |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared unit tests | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts packages/shared/src/utils/assistedCreationCustomerUpdate.test.ts packages/shared/src/constants/assistedCreation/assistedCreation.constants.test.ts` | 0 | 12 pass |
| Email unit tests | `npx tsx --test functions/src/lib/email/email.test.ts` | 0 | 8 pass |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| Studio Vite build | `npx vite build` from `apps/studio` | 0 | pass (chunk size / circular chunk warnings pre-existing) |

---

## Skipped / Notes

- Full monorepo lint / Studio `tsc` not required for this slice; targeted checks above cover changed surfaces.
- Opt-out enforcement, email-sent history, and unread ack rules need **fresh-prints-dev** Functions + rules deploy before live verification (same deferred email wave).
- Manual UI checkpoint required for Back flash, Notifications modal, unread badges, Studio cold start feel.

---

## Manual Follow-up

See `docs/workflow/reviews/2026-07-17-wizard-back-notif-studio-startup-manual-qa.md`.
