# Implementation Review — Stage 1a Owner QA Amendment 2

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Independent Implementation Reviewer |
| Scope | Amendment 8 Phase 1B Stage 1a Owner QA Amendment 2 (Case A — Studio archive did not persist) |
| Baseline | Amendment 1 `c15a7be` (mapper-only) FAIL on owner re-QA |
| Initial verdict | **APPROVED_WITH_CHANGES** |
| Final verdict | **APPROVED** (required corrections applied) |

## Summary

Case A from live Firestore: categories remained `isActive: true`; Portal was correct. Studio persist fix (`persistCategoryArchive` + client fallback + refuse success unless inactive) targets the failing layer. Root-cause narrative tightened (no proven callable false-success given 0 POSTs). Portal category module TTL removed; focus/visibility reload retained.

## Must-verify checklist

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Live Firestore Case A | **PASS** | 18/18 active; 0 inactive; 0 category-archive POSTs / 90d |
| 2 | Root cause evidence | **PASS** | Case A + missing postcondition/fallback + owner-only Function footgun; no false-success callable claim |
| 3 | Fix hits failing layer | **PASS** | Studio persist; not Portal mapper compensation |
| 4 | Amendment 1 mapper | **PASS** | Still `isActive === true` |
| 5 | Firestore-only categories | **PASS** | Query + mapper; no generated taxonomy |
| 6 | Empty active categories valid | **PASS** | No design-count filter on Portal list |
| 7 | Archive/restore freshness | **PASS** | Studio archive postcondition+fallback; restore already client; Portal focus/visibility + hard refresh (no module TTL) |
| 8 | No generated taxonomy fallback | **PASS** | |
| 9 | Search/multi-tag/facets | **PASS** | Untouched |
| 10 | No deploy/prod action | **PASS** | Function source only |

## Required corrections — status

| Item | Status |
|------|--------|
| Tighten root-cause (no callable false-success as proven) | **Done** — Amendment 2 record |
| Amendment 2 record under `docs/workflow/` | **Done** |
| Portal TTL: drop or invalidate on mount | **Done** — TTL removed; focus/visibility only |
| Owner re-QA checklist with Firestore confirm | **Done** — manual QA doc |

## Code assessment

`persistCategoryArchive` sound. Client design-ref guard aligns with Function. Amendment 1 mapper retained. No blocking defects after corrections.

## Final verdict

**APPROVED** — proceed to commit/push and reduced owner re-QA. No Signoff this pass.
