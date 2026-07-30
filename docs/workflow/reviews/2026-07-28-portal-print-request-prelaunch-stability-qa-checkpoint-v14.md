# Portal Print Request Pre-Launch Stability — Owner QA (v14, post-Amendment 12 correction)

- **Goal:** `portal-print-request-prelaunch-stability`
- **Phase:** Test — Implementation Review 14 **`APPROVED`**
  (`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-14.md`)
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 30 / Amendment 12
- **Deployment:** none required; this remains a client-only change.

## What was wrong, and what changed

### 1. The Retry control appearing inert, and its warning disappearing on navigation

Root cause found and fixed — two compounding issues, both in the Studio production-timer hook:

- Clicking Retry when there was nothing retryable at that moment produced literally no visible
  effect at all (no "Retrying…", no message, nothing) — it now shows a clear status instead of a
  silent no-op.
- The warning and Retry button were only ever held in short-lived on-screen memory, never checked
  against what's actually still true in the system. Navigating away from Show Queue and back reset
  that memory to blank — which looked like the problem had resolved itself, whether or not it
  actually had. Returning to a finished show now re-checks its real status and shows the warning
  again if requests are still genuinely unresolved, and shows nothing if they're genuinely resolved.
- A new diagnostic trace is added so the next live Retry attempt can tell us definitively what
  happened (whether the update reached the server, whether a genuine error came back, etc.) instead
  of another round of guessing.

### 2. Historical shows still showing the "you're out of print spots" message

Root cause found and fixed: a background list of shows was occasionally a few seconds stale, and in
that narrow window a show that had just finished printing could still be treated as if it were open
for new requests, showing the "you've used all your print spots" message even though the show can no
longer accept requests at all. The fix waits for a fresh confirmation of a show's status before
showing that message. A show that is genuinely still open and genuinely full still shows the message
exactly as before — this only removes it from shows that can't take requests at all.

## Automated verification already performed (do not re-run these yourself)

- `npx tsx --test` across the directly affected surface — **77/77 pass, exit 0** (13 new tests for
  this pass, 64 regression tests confirming nothing from any prior amendment broke).
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
- `npm run build:portal` — **exit 0** (19/19 pages).
- `npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing errors, none
  attributable to this pass.
- `npm run lint` — **exit 1**, confirmed still exactly 41 pre-existing problems, none new.
- `git diff --check` — exit 0.
- Confirmed: no Function deployment, no Rules deployment, no production action occurred.

---

## What you need to test (only what genuinely requires a live session)

### Test 1: Finish, then Retry if a warning appears

1. Start, Pause, Resume, Finish a production run as before.
2. Confirm the production lifecycle and mounted Portal progress still work exactly as before (no
   regression).
3. If a retry warning appears, click Retry. Confirm it now visibly shows "Retrying…", then either
   clears (success) or shows a clear message (failure/remediation) — never nothing.
4. Navigate away from Show Queue to a different page, then back to the same finished show. Confirm
   the warning/Retry button reappears if requests are still genuinely unresolved, and stays absent if
   they've since resolved.
5. Capture the sanitized console object:
   `[useShowProductionTimer] request reconciliation retry activation`
   and paste it in your response.

### Test 2: historical show capacity messaging

1. Select a show that has already finished printing.
2. Confirm the "you've used all your print spots" message does **not** appear for that show.
3. Confirm its normal read-only details (used-count, no "spots remaining" line, disabled Add) still
   appear exactly as before.
4. Select a genuinely open show where you've used all your spots and confirm the message still
   appears there, exactly as before.

### Test 3: brief regression smoke

- mounted Portal progress
- personal usage wording
- multiple separate requests may total exactly 25; more than 25 blocked
- switching shows clears stale state
- typed quantity clamp
- Show Queue live allocation update
- removed-item persistence
- `Request Again`
- Firebase Debug available (Ctrl+Shift+F)
- customer elapsed clock absent
- 200-effective-DPI floor

## Owner response format

Use exactly one of:

```text
PASS
PASS WITH NOTES: ...
FAIL: ...
```

Do not sign off or begin any queued goal
(`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`,
`customer-upload-oversized-image-normalization-and-processing-performance`, `production-release`)
before the owner response.
