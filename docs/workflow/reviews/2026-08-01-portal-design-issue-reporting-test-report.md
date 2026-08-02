# Test Report: Portal design issue reporting

Date: 2026-08-01

| Verification | Result |
|---|---|
| Focused validation + cross-layer contract tests | PASS — 6/6 |
| Firestore/Storage Rules emulator, including new report suite | PASS — 60/60 with portable Temurin 21 |
| Functions TypeScript build | PASS |
| Portal TypeScript | PASS |
| Studio TypeScript | PASS |
| Repository lint | PASS, zero warnings |
| Portal production build | PASS, 19/19 static pages generated |
| Studio production build/package | PASS; only established bundle/dependency warnings |
| `git diff --check` | PASS |

The first Rules attempt could not locate Java and the first Portal build was blocked by the running dev server's `.next/trace` lock. Both were environmental: the final Rules run used the documented portable JDK and the final Portal build ran after stopping the dev server. The two lint dependency warnings found in the initial pass were corrected before the final zero-warning run.

Coverage includes approved description normalization/bounds, deterministic Chicago quota keys/fingerprints, trusted callable wiring, no native dialogs, server-owned identity/lifecycle, active-customer and staff authorization paths, idempotency/quota/open-guard architecture, design-integrity non-mutation, one bounded open listener, on-demand bounded history, exact Rules denial, and exact composite indexes. Authenticated end-to-end development behavior remains the owner-QA checkpoint after approved deployment.
