# Portal Print Request Pre-Launch Stability — Owner QA (v15, post-Amendment 13 correction)

- **Goal:** `portal-print-request-prelaunch-stability`
- **Phase:** Test — Implementation Review 15 **`APPROVED`**
  (`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-15.md`)
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 31 / Amendment 13
- **Deployment:** none required; this remains a client-only change.

## What was wrong, and what changed

### The false-positive "needs retry" warning right after Finish

Root cause found and fixed. Immediately after Finish, Studio double-checks whether each affected print
request is now fully printed and marks it done. That double-check reads the exact same records the
Finish action just wrote, an instant after writing them — and in that narrow instant, Firestore's own
"this was just written by the server" marker hadn't fully settled yet on that specific read, so the
check occasionally (and only occasionally) concluded a request wasn't finished yet when it actually
already was. That's exactly why no real error ever appeared, and exactly why the warning went away on
its own after navigating away and back — by then, enough time had passed for that marker to settle, and
the same check correctly saw everything was fine.

The fix: right after that first check, if anything comes back as needing retry, Studio now
double-checks only those specific requests one more time before showing anything to you. If a request
was only caught in that brief settling window, this second check sees it clearly and no warning
appears at all. If a request is genuinely still unresolved for a real reason, it's reported exactly as
before, with a working Retry button.

## Automated verification already performed (do not re-run these yourself)

- `npx tsx --test` across the directly affected surface — **87/87 pass, exit 0** (5 new tests for this
  pass, 82 regression tests confirming nothing from any prior amendment broke).
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
- `npm run build:portal` — **exit 0** (19/19 pages).
- `npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing errors, none
  attributable to this pass.
- `npm run lint` — **exit 1**, confirmed still exactly 41 pre-existing problems, none new.
- `git diff --check` — exit 0.
- Confirmed: no Function deployment, no Rules deployment, no production action occurred.

---

## What you need to test (only what genuinely requires a live session)

### Test 1: Finish, with no false Retry warning

1. Start, Pause, Resume, Finish a production run as before.
2. Confirm no "needs retry" warning appears immediately after Finish, when there's genuinely nothing
   wrong.
3. Confirm the production lifecycle and mounted Portal progress still work exactly as before.

### Test 2: a real unresolved request (only if one can be safely reproduced)

If a genuinely retryable condition can occur naturally without manufacturing bad data:

1. Confirm the warning remains after navigating away and back.
2. Click Retry, confirm it shows "Retrying…", then a clear success or failure result.

Do not manufacture or corrupt production-like data solely to force this test.

### Test 3: brief regression smoke

- mounted Portal progress
- historical capacity messaging (from Amendment 12)
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
