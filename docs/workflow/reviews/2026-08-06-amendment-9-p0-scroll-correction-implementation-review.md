# Amendment 9 P0 Scroll Correction — Independent Implementation Review

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Scope | Owner-QA scroll correction on top of P0 local reconciliation |
| Baseline P0 HEAD | `0a948e03df17b83b08bfbefcbe4f11b552d5fd3e` |
| Verdict | **APPROVED** |

## Method

Re-read scroll helper, `useAiReviewInbox` success/failure paths, `AiReviewWorkspace` layout effect, `AiReviewPage` wiring, and focused tests. Confirmed AppShell scroll owner in CSS/class usage. Confirmed no reload/count/Firestore additions on the happy path.

## Challenge table

| # | Check | Result |
|---|---|---|
| 1 | Actual scroll container used (`.page-content-area--ai-review`), not `window` | **PASS** |
| 2 | Scroll runs after next design / empty state commit (`useLayoutEffect` + selected id) | **PASS** |
| 3 | No `reloadDesigns` / full-page reload reintroduced on success | **PASS** |
| 4 | No new Firestore read / listener / timer / polling | **PASS** |
| 5 | Processing observer / patch paths do not bump scroll nonce | **PASS** |
| 6 | Keyboard and button approve/reject/archive share `runInboxAction` → same scroll trigger | **PASS** |
| 7 | Failure path does not scroll via nonce; recovers with bounded reload only | **PASS** |
| 8 | P0 budgets remain zero list/count refresh on success (wiring + fixture tests) | **PASS** |
| 9 | No P1/P3/P4/Phase 1B / Firebase / production | **PASS** |

## Residual risks (non-blocking)

- Very tall preview images that load after layout may still require a tiny manual nudge if intrinsic height changes after `useLayoutEffect`; current Studio convention does not wait on image decode.
- Final-item empty state scrolls workspace top into view; accepted.

## Signoff

**Not recorded.** Awaiting owner re-QA on scroll + acknowledgment of server attribution findings.
