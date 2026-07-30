# Firestore Usage Efficiency Wave C — Phase 0 Containment Review

| Field | Value |
|---|---|
| Date | 2026-07-23 |
| Scope | Internal Gate 1 emergency containment |
| Verdict | **passed_with_notes** |

## Review finding

The implementation addresses every source proven by the supplied trace: full taxonomy pagination,
full Design Library hydration, duplicate taxonomy consumers, repeated AI counts, eager Print
Requests ready-design hydration, populated-tab navigation replacement, unbounded Staff Inbox
listeners, and late-completion route misattribution.

The first owner smoke failed: Firebase visibly moved from rounded `34K` / `67.9%` to `36K` /
`71.7%` across the complete idle-plus-navigation run, and Print Requests emitted Chromium's
navigation-throttling warning and froze. Its trace nevertheless proves Inbox idle was quiet and
contained no duplicate active listener signatures.

The routing remediation now has one URL authority. A subsequent developer-controlled authenticated
Electron run completed five tab cycles, empty/populated tabs, and back/forward with no throttling
warning, freeze, reload, loading loop, console error, or listener growth.

The corrected owner finding establishes that the primary Working/Queued/Printing/Printed tabs now
work. The remaining defect was inside Working: a selected Empty/All request caused the local
Active/Stale click to be overwritten by the deep-link reveal effect, which forced All to preserve the
old request. This was a local state-precedence defect; the supplied trace retained 7 stable listeners,
no duplicates, and no catalog/taxonomy one-shots.

Working filter state is now part of the canonical URL. Explicit clicks outrank selection preservation,
choose a compatible request or clear it, and make one history write. Passive normalization preserves
the filter. Authenticated Electron passed the four exact Empty/All → Active/Stale cases, Back/Forward,
leaving the route, and read-containment checks with no warning, freeze, reload, loop, error, or
reversion. Focused tests pass 46/46. The corrected owner retest then confirmed this secondary
control behavior with all six checks passing.

The corrected owner retest subsequently passed all six checks. Phase 0 containment is therefore
`passed_with_notes`. The note is Firebase dashboard rounding and reporting delay during the earlier
broad smoke test; there is no remaining measured navigation or read-amplification blocker.

## Gate decision

- Long-term taxonomy/reference snapshots: **approved for local implementation**
- Generated Portal catalog/search assets: **approved for local implementation**
- Controlled 10–20 design import: **still requires the plan's later initialization/deployment checkpoint**
- Firebase deployment, rules/index changes, initialization, migration, production: **not authorized**

The completed trace matrix and owner retest meet the containment gate. Any later regression in idle
repetition, listener growth, full taxonomy/catalog hydration, or navigation remains a release blocker,
but does not change the recorded Phase 0 result without new evidence.
