# Production maintenance-mode prerequisite — corrective amendment Owner DEV QA

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** `fresh-prints-dev` / local Portal and Studio<br>
**Owner result:** **PASS**

## Owner-verified journey

The owner completed the final corrective DEV QA after the reviewed implementation, automated Test,
and narrow DEV deployment. The following behavior passed:

- Studio Portal Maintenance Settings match the normal Studio styling.
- Separate `Maintenance heading` and `Maintenance message` fields are present.
- Saved heading/body copy appears in Portal at runtime without a rebuild.
- Merged and disabled customer accounts are absent from the maintenance tester selector.
- A valid active linked customer can be configured as the tester.
- With maintenance ON, ordinary customers receive the full-screen maintenance experience.
- The configured tester receives normal Portal access with the yellow maintenance-testing banner.
- The tester completes a representative safe customer mutation.
- Owner/admin `/admin/show-queue` access remains functional.
- Unauthorized Show Queue access shows the centered styled Access denied state.
- Turning maintenance OFF restores normal Portal behavior and removes the tester banner.

## Boundary

This QA was performed by the owner. Codex did not impersonate the owner, mutate the maintenance
setting during QA, perform production actions, activate production maintenance, publish Studio or
Portal, or advance the parent coordinated production rollout.
