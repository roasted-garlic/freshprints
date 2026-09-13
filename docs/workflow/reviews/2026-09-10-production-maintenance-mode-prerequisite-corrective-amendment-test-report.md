# Production maintenance-mode prerequisite — corrective amendment Test Report

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** local source plus DEV Rules/Firestore emulators<br>
**Production:** untouched

## Automated gates

| Check | Result |
|---|---|
| Focused shared/Functions/Portal/Studio maintenance contracts | **PASS — 10/10** |
| Trusted tester integration | **PASS — 4/4** under Firestore emulator; invalid, inactive, deleted, disabled, merged, orphaned, and ambiguous targets reject; active linked target lists/saves; clearing removes bypass |
| Firestore + Storage Rules emulator regression | **PASS — 182/182**, 22 suites; Rules source was unchanged |
| Functions build | **PASS** — `npm run build` in `functions` |
| Portal typecheck | **PASS** — `npm run typecheck --workspace @fresh-prints/portal` |
| Changed-source ESLint | **PASS** — explicit corrective file allowlist, zero warnings/errors |
| `git diff --check` | **PASS** |
| Studio project typecheck | **Known baseline** — 25 existing unrelated diagnostics; none reference corrective files |
| Portal production build | **Known existing Windows blocker** — `next build` cannot open `apps/portal/.next/trace` while the existing dev process owns the output; not caused by this amendment |

## Security and behavior evidence

- Shared tests prove missing state is OFF, friendly heading/body defaults are used, custom copy is
  bounded, public projection omits the private UID, and only the configured eligible caller can
  bypass ON maintenance.
- Integration tests prove the single trusted eligibility helper excludes merged and disabled
  records, rejects inactive/orphaned/ambiguous links, lists only eligible customers, and removes a
  stale tester bypass after a merge.
- Studio contract coverage proves native Settings primitives, separate heading/body controls,
  owner/admin candidate-list wiring, exact UID preservation, and a disabled unavailable row.
- Full Rules regression preserves direct-write denial, owner/admin callable control, ordinary
  customer/guest restrictions, and existing customer mutation guards.

## Test conclusion

All corrective amendment-specific automated gates passed. The documented Studio baseline and
Windows Portal `.next/trace` ownership error remain non-corrective environment constraints. The
source is ready for the reviewed DEV-only redeployment; Owner DEV QA remains pending.
