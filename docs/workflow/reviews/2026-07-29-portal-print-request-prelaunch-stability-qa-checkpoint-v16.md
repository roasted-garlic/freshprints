# Portal Print Request Pre-Launch Stability — Final Owner QA v16

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** Section 32 / Amendment 14
- **Implementation Review 16:** `APPROVED`
- **Deployment:** none; fully restart Studio before testing

This is the final authorized engineering attempt. Run only:

1. Fully close and restart Studio.
2. Start a production run.
3. Pause.
4. Resume.
5. Finish.
6. Confirm no false `request update(s) need retry` warning or Retry button appears.
7. Navigate away from Show Queue and return.
8. Confirm the warning remains absent.

Respond with exactly one:

```text
PASS
PASS WITH NOTES: ...
FAIL: ...
```

If the false warning remains but Studio/Portal lifecycle and persisted state are still correct, no
further amendment will be created. Recommended response:

```text
PASS WITH NOTES: Studio may briefly display a false post-Finish request Retry warning. The requests, allocations, Studio lifecycle, and Portal progress all complete correctly, and the warning disappears after navigation.
```

Do not begin queued goals or production release until this owner response is recorded.
