# Portal Print Request Pre-Launch Stability — Owner QA Checkpoint v17

**Status:** awaiting owner result  
**Implementation Review 17:** `APPROVED`  
**Deployment:** none; fully restart Studio to load the client change

This is the final owner-authorized live check for Amendment 15. Previously passing Portal,
historical-show, capacity, and broader regression behavior does not need to be repeated.

## Minimal owner test

1. Fully restart Studio.
2. Start Printing.
3. Pause.
4. Resume.
5. Finish.
6. Confirm either:
   - no warning appears because every request completed; or
   - a genuine `Retry request updates` button appears.
7. If Retry appears, click it once and confirm it immediately changes to disabled `Retrying…`,
   performs one real attempt, and returns success, failure, or remediation feedback.
8. Navigate away and return.
9. Confirm the displayed reconciliation state remains truthful.

Reply with exactly one:

- `PASS`
- `PASS WITH NOTES: <note>`
- `FAIL: <what appeared, what happened after Retry, and the sanitized retry-session diagnostic>`

Do not sign off the managed goal until the owner replies.
