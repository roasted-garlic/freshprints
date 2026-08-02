# Test Report: Donated Designs Amendment 2

Date: 2026-08-01

| Check | Result |
|---|---|
| Focused Studio/Functions behavior and contract suite | PASS — 43/43, exit 0 |
| Studio TypeScript | PASS — exit 0 |
| Functions TypeScript build | PASS — exit 0 |
| Studio production build/package | PASS — exit 0 |
| Repository lint | PASS — exit 0 |
| `git diff --check` | PASS — exit 0; line-ending notices only |

Coverage includes: no native prompt/confirm/alert; exact `Delete Upload` label; in-app preview modal; cancel/Escape/focus containment; one guarded delete call with current row ID; allowed/blocked/already-done/error states; downward menu and collision fallback; owner/admin client capability; helper client denial; owner/admin trusted assertion; helper/customer/inactive trusted denial; print-request-item and promoted-design blockers; only four approved Storage paths; exclusion metadata-only transition; no exclusion Storage/document delete; active staff exclusion; and retained restore/downstream handler wiring.

No Rules test was required because Rules did not change and both mutations remain callable/Admin SDK operations. Manual authenticated development owner/admin/helper QA remains pending.
