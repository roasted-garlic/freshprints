# Test Report: Studio Messages deep-link scroll + mark read on reply

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Plan | `docs/workflow/plans/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-plan.md` |
| Status | **passed_with_notes** |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Shared unit | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts` | **pass** (9/9) |
| Studio Vite build | `npx vite build` in `apps/studio` | **pass** |
| Studio `tsc --noEmit` | `npx tsc --noEmit -p tsconfig.json` in `apps/studio` | **skipped / pre-existing fail** — `tsconfig.json` `ignoreDeprecations` invalid value (`TS5103`); unrelated to this change |

## Implementation notes (for QA)

- **Scroll:** On Messages tab, double `requestAnimationFrame` then `scrollIntoView` on the messages panel + `thread.scrollTop = scrollHeight`.
- **Read-on-reply:** After successful staff send, `onMarkHistoryEntryRead(latestAssistedCreationCustomerUpdateAtMs(...))` via existing monotonic ack service.

## Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio Messages deep-link scroll + mark-read-on-reply | **PASS** | Owner (2026-07-17) |

See `docs/workflow/reviews/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-manual-qa.md`.

## Deploy

None required (Studio renderer-only).
