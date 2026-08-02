# Test Report: Donated Designs overflow menu Amendment 1

Date: 2026-08-01

| Check | Result |
|---|---|
| Focused menu geometry/interaction and intake contract tests | PASS — 19/19, exit 0 |
| Studio TypeScript | PASS — exit 0 |
| Studio production build/package | PASS — exit 0 |
| Repository lint | PASS — exit 0 |
| `git diff --check` | PASS — exit 0; line-ending notices only |

Focused coverage proves the default/preferred placement is below; sufficient space never flips; insufficient space with more room above flips upward; fixed coordinates clamp inside the viewport; the body portal escapes the unchanged intake clip; portaled item clicks remain inside; and toggle, outside click, Escape/focus return, selection close, disabled/empty state, accessibility, selected-design/filter cleanup, exact delete action, and zero mutation on open remain intact.

The build emitted only the existing nonblocking Vite chunk/dynamic-import warnings and electron-builder dependency discovery diagnostics; packaging completed.

Manual authenticated development owner QA remains pending for the amended downward placement.
