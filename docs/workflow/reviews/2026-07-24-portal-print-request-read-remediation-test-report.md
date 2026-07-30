# Portal print-request read remediation test report

Date: 2026-07-24  
Goal: `firestore-usage-efficiency-wave-c`  
Verdict: **automated pass; owner runtime retest required**

## Commands and results

- `npm run typecheck --workspace @fresh-prints/portal` — pass
- `npm run build:portal` — pass, 19/19 static pages generated
- `npm run build --prefix functions` — pass
- Focused catalog/cache/debug/accounting suites — 45/45 pass
- Changed-file ESLint with `--max-warnings 0` — pass
- `git diff --check` — pass (line-ending notices only)

## Covered behavior

- concurrent identical request reads share one promise
- shell-primed request data is reused
- rejected loads are evicted
- invalidated stale completions are not retained
- generated Portal catalog behavior/search remains passing
- popup protocol accepts refreshed-owner discovery while rejecting stale commands
- snapshots containing forbidden payload/document keys remain rejected
- created versus incremented catalog-line write accounting is exact
- Portal and Functions compile successfully

## Runtime checkpoint

Automated tests cannot measure the Firebase Console billing graph. Owner must verify one four-item
cold load, one repeat navigation, and one main-tab refresh while the popup stays open. No deployment,
republish, snapshot rebuild, rules change, or production action was performed.
