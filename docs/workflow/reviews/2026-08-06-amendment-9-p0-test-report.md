# Amendment 9 P0 Test Report

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Scope | Amendment 9 P0 + owner-QA scroll correction |
| Owner QA (first pass) | **FAIL** — scroll regression; Console ~7.7K unresolved vs client |
| Owner QA (re-QA) | **PASS WITH NOTES** (2026-08-06) — scroll + budgets OK; Design Library modal/lightbox mat + snapshot spike are follow-ups |
| Signoff | **approved_with_notes** — `docs/workflow/reviews/2026-08-06-amendment-9-p0-signoff.md` |

## Commands run (scroll correction pass)

| Command | Result |
|---|---|
| Focused scroll + P0 + Processing suites (`npx tsx --test` …) | **50/50 pass** (earlier); scroll+P0 focused **26/26 pass** |
| Full AI Review suite (22 files via explicit file list) | **166/166 pass** |
| `npx tsc --noEmit` in `apps/studio` | **exit 0** |
| `npx vite build` in `apps/studio` (renderer + main + preload) | **exit 0** |
| ESLint on touched AI Review scroll files | **exit 0** (after unused-var fix) |
| `git diff --check` on AI Review paths | **exit 0** |

## P0 budget fixture (spy-based)

`simulateLocalNeedsReviewApprovals(45 ids)` via real `reconcileSuccessfulInboxManualAction`:

| Metric | Result |
|---:|---:|
| `listReloadCallCount` | **0** |
| `countRefreshCallCount` | **0** |
| `applyPatchCount` | **45** |
| `needsReviewDeltaSum` | **−45** |
| Final selection | **none** |
| Triangular contrast | 990 docs avoided |

## Mandatory budgets

| Metric | Acceptance | Status |
|---|---:|---|
| Successful post-approval list docs | 0 | Met (0 reload spies) |
| Successful per-action counts | 0 | Met |
| Recovery list reload | ≤1 / failure | Met (`recoverFailedInboxManualAction`) |
| Recovery counts | ≤3 / failure | Met (one `onQueueChanged`) |

Authority `getDoc` counts unchanged (P1 out of scope) — not a fail criterion.

## Scroll correction tests

| Check | Result |
|---|---|
| `scrollAiReviewPageContentToTop` targets `.page-content-area--ai-review` | Pass |
| Success path bumps `reviewScrollNonce` | Pass |
| Failure / Processing paths do not | Pass |
| Workspace uses `useLayoutEffect` + helper (no `window.scrollTo`) | Pass |
| Page wires `reviewScrollNonce` | Pass |
| Success path still avoids `reloadDesigns` / `onQueueChanged` | Pass |

## Manual evidence — post-P0 owner Debug (FAIL for scroll / Console)

Owner Debug summary (session start `2026-08-06T16:53:20.612Z`; first event `16:55:10.196Z`; last `17:01:21.457Z`):

| Metric | Value |
|---:|---:|
| Approx client reads | **1,375** |
| Designs | **236** |
| Tags | **1,121** |
| Categories | **18** |
| Listeners | **0** |
| Callables | **45** |
| Writes | **225** |

Confirmed by owner:

1. No post-approval full-page reload
2. No post-approval triple-count refresh
3. Only initial AI Review list queries for lists
4. Count queries before manual review (not per action)
5. Design reads 1,356 → 236 (−1,120)
6. Fixed 1,121-tag startup remained
7. No listener storm

**Raw post-P0 JSON not on disk** at correction time (`Downloads/output.txt` is still pre-P0). Keep owner summary as authoritative for client budgets.

Firebase Console still showed ~**7.7K** reads for the same owner test — see
`docs/workflow/reviews/2026-08-06-amendment-9-p0-server-read-attribution.md`
(**snapshot publication dominated** in UTC `16:54:30Z`–`17:02:00Z`).

## Owner QA status

| Pass | Result |
|---|---|
| First owner QA | **FAIL** (scroll + unresolved Console attribution) |
| Automated P0 budgets | **PASS** |
| Scroll correction Implementation Review | **APPROVED** |
| Owner re-QA | **PASS WITH NOTES** |
| Signoff | **approved_with_notes** (P0 only; PR unmerged; no deploy) |
