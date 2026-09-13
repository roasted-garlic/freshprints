# Test Report: Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `assisted-creation-multi-proof-selection` |
| Status | Automated checks **passed_with_notes**; Owner DEV QA pending |
| Signoff | Not created |

## Commands

| Check | Result |
|---|---|
| Focused unit (proof rounds, notifications, history, email, WS2/sentinel contracts) | **54/54 pass** |
| Functions build (`npm run build --prefix functions`) | **PASS** |
| Portal typecheck | **PASS** |
| Targeted ESLint (touched files) | **PASS** |
| `git diff --check` (touched paths) | **PASS** (CRLF warnings only) |
| Studio `tsc --noEmit -p apps/studio/tsconfig.json` | **Baseline failures** unrelated to multi-proof (Staff Artwork/Select/inbox/etc.); no new multi-proof-specific errors identified in allowlisted files |

## Coverage notes vs 44-item gate

Automated coverage includes round label/order resolution, batch normalize/dupe rejection,
round-scoped proof job/notification ids, final-artwork email template/id survival, history email
notes, WS2 progress/no-consent contracts, catalog confirmation / not_eligible / no auto Design
wiring, Functions build, Portal typecheck, lint, diff check.

Live Owner DEV QA remains required for multi-option UX, reorder→labels, approve/revision,
notification dedupe, final artwork email, Add-to-Request progress, and induced upload cleanup.
Server stale/foreign/duplicate rejection is enforced in the callable and covered by unit helpers;
full transactional emulator suite not added this turn (documented as Owner QA + unit boundary).

## Notes

- Studio full-project typecheck retains pre-existing baseline errors outside this child’s allowlist.
- No Rules/Storage emulator suite change required (no Rules/Storage edits).
