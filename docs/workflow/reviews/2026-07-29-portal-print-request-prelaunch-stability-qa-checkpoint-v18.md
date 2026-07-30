# Portal Print Request Pre-Launch Stability — Owner QA Checkpoint v18

**Status:** PASS — owner approved 2026-07-29
**Implementation Review 18:** `APPROVED_WITH_CHANGES`, no blocking findings remain

Codex did not redeploy. The read-only deployed/local comparison could not authenticate through
Application Default Credentials, so the active ruleset identifier and hash match remain
`[NEEDS OWNER CONFIRMATION]`. This does not block the owner-requested live QA.

After deployment:

1. Fully restart Studio.
2. Start Printing, Pause, Resume, then Finish.
3. Confirm no `request_write (permission-denied)` error and no Retry warning.
4. Confirm Portal remains Printed.
5. Navigate away from Show Queue and return; confirm the request remains completed with no warning.
6. Confirm the request is locked/placed as completed in Studio and historical Portal behavior remains
   correct.

## Owner result

Owner QA v18: **PASS**

- Start, Pause, Resume, and Finish work.
- No `request_write (permission-denied)` error appears.
- No Retry warning or Retry button appears.
- Portal remains Printed.
- Navigating away from Show Queue and returning preserves the completed state.
- The request is locked and placed as completed in Studio.

The managed goal may proceed to final signoff. No redeployment or production action is required.
