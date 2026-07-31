# Formal Review: Production Studio White-Screen Remediation (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Plan reviewed | `docs/workflow/plans/2026-07-30-production-release-studio-white-screen-fix-plan.md` |
| Verdict | **approved** |

---

## Review Method

Independently re-derived the root-cause chain rather than accepting the Plan's framing at face
value. Re-read `apps/studio/vite.config.ts`'s `manualChunks` function directly (lines 47-88) and
confirmed the `id.includes('node_modules/react')` condition is indeed a bare substring match with
no trailing separator — this would match any `node_modules` path containing the four characters
"react" anywhere after that prefix, not just the literal `react`/`react-dom` package roots.
Confirmed via the session's own recorded build log that Rollup emitted `Circular chunk: vendor ->
react-vendor -> vendor` during the original Phase F build — this is contemporaneous evidence from
the actual build that produced the failing installer, not a reconstruction. Confirmed the owner's
independently-captured runtime error (`Cannot read properties of undefined (reading
'createContext')` at a specific line in `vendor-9Mud9pNT.js`) is consistent with a React-family
API being invoked against a chunk that does not yet have a fully-initialized `react`/`scheduler`
reference — exactly the failure mode a circular chunk dependency between `vendor` and
`react-vendor` would produce.

Independently verified the claimed extraction findings are internally consistent: the Plan states
`scheduler` was found in `vendor-9MUd9pNT.js` and absent from `react-vendor-B-OSQFcj.js` via direct
`asar extract` + `grep`. This is a falsifiable, reproducible claim (the exact commands are
reproducible against the same packaged artifact) and is the single piece of evidence that most
directly explains the crash — not just "a circular chunk warning exists" but "the specific missing
package is `scheduler`, which `react-dom` requires at initialization."

---

## Findings

### Confirmed accurate

- The elimination of Firebase environment injection as a cause is well-supported: the Plan cites a
  direct extraction of the actual packaged bundle (not the loose `dist/` folder, which could have
  been stale from a later build) and quotes the exact embedded `PROJECT_ID` value. This is the
  correct standard of evidence — showing the packaged artifact's actual content, not merely
  asserting the source `apphosting.yaml`/`.env` values were probably right.
- The elimination of packaged asset-path issues is similarly well-supported by directly reading the
  packaged `dist/index.html` content, not the source `apps/studio/index.html` (which does still
  have the separate, correctly-identified favicon issue).
- The distinction between "circular chunk" as a Rollup **warning** (not a build failure) versus the
  existing verification suite's blind spot (nothing inspects build warnings or launches the
  packaged output) is the single most important structural finding in this Plan — it correctly
  identifies not just the bug but the process gap that let it ship, which directly informs §2.3's
  proposed regression protection.
- The favicon fix (§2.2) is correctly classified as a real-but-separate bug, not conflated with the
  white-screen root cause, and correctly scoped as low-risk/high-confidence to fix in the same pass
  without requiring its own separate investigation.
- The fix itself (§2.1) is minimal, targeted, and directly addresses the confirmed mechanism: using
  a trailing `/` after each package path turns the check from a substring match into a real
  package-boundary match, and explicitly listing `scheduler` alongside `react`/`react-dom` directly
  closes the gap that caused the bug. This does not touch any other chunk-assignment logic
  (Firebase chunks unchanged), keeping the change narrowly scoped.

### Minor gaps (do not block approval — recommend addressing during Implementation)

1. **§2.1's `[NEEDS REPO CHECK]` on other React-internal packages** — appropriately flagged rather
   than asserting `scheduler` is the *only* miscategorized package. Implementation should verify
   this by inspecting the rebuilt chunks, not by assuming the Plan's single-package fix is
   necessarily complete on the first attempt.
2. **§4 step 8-9's environment limitation** — the Plan is honest that this sandboxed environment
   could not sustain a GUI process during the evidence-gathering phase of this same incident, and
   correctly does not promise it will suddenly work for verification. Recommend Implementation
   attempt the unpacked-launch verification step regardless (environment behavior earlier in this
   session was inconsistent enough that a clean retry is worth one attempt) but not block on it if
   it reproduces the same silent-exit limitation — the owner-side retest in §6 is the real gate
   either way.
3. **§2.3's proposed `onwarn` build-failure hook** — a good instinct (deterministic, no GUI
   required, directly targets the actual failure class), but the Plan correctly leaves its exact
   implementation as `[NEEDS REPO CHECK]` rather than prescribing Rollup API specifics it hasn't
   verified against the installed Rollup/Vite version. Recommend Implementation confirm the exact
   `onwarn` signature works with this repo's Vite 5.4.21 before relying on it, and keep the change
   narrow (fail only on `code === 'CIRCULAR_DEPENDENCY'`-shaped warnings relevant to this class of
   bug, not broaden into unrelated warning suppression/promotion).

### No blocking findings

No fabricated file path, API, or mechanism. The root cause is supported by concrete extracted
evidence from the actual failing artifact plus the owner's own captured runtime error, not
speculation. The fix directly targets the confirmed mechanism without touching unrelated code. The
Plan does not claim the fix is guaranteed correct without the owner's real-machine retest — it
correctly treats that retest as the actual verification gate, consistent with this environment's
demonstrated inability to host a GUI process.

---

## Verdict Rationale

**Approved.** This is a rare case where the root cause was established through genuine
multi-layered evidence (a build-time warning, a direct binary/bundle extraction, and an
owner-captured runtime stack trace) that all point to the same specific, named mechanism — not
guessed from a plausible-sounding theory. The fix is minimal and narrowly scoped to that mechanism.
Implementation should proceed directly to Plan §2, complete the full verification suite in §4, and
must stop at the `development`→`production` PR checkpoint per §6 — no replacement installer may be
built or distributed until that PR is confirmed merged and the exact commit re-verified.
