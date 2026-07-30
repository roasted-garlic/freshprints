# Portal Print Request Pre-Launch Stability — Owner QA (v13, post-Amendment 11 correction)

- **Goal:** `portal-print-request-prelaunch-stability`
- **Phase:** Test — Implementation Review 13 **`APPROVED`**
  (`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-13.md`)
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 29 / Amendment 11
- **Deployment:** none required; this remains a client-only change.

## What was wrong, and what changed

### 1. The unresolved request-completion write

You asked why this write is needed since Portal progress already looks correct. It's answered from
an exhaustive audit: this field is genuinely used elsewhere in Studio (it excludes fully-printed
requests from the "add to show" picker, locks the print-request detail panel from further edits, and
determines which list tab a request appears in) and by two Firebase Functions (delete/archive
routing and an upload-cleanup eligibility check). It is not obsolete, and its retry mechanism is kept.

The diagnostic used to decide whether a request's completion write can proceed has been extended: it
now separately checks the exact customer/guest-assignment condition Firestore's security rules
enforce. This doesn't fix the live denial by itself, but the next time Retry is used, it will tell us
definitively whether that specific condition is the cause — closing a real gap where a document could
look fine to every check this app already ran, while still being denied by the rules.

### 2. The Retry button appearing inert

Root cause found and fixed: it wasn't a broken button. After Finish, if the show had been running
long enough that its originally-scheduled start time had since passed, the page would silently
reclassify it from "Upcoming" into "Past" behind the scenes — and because you were viewing the
"Upcoming" list, the page would quietly switch your selection to a different show (or none), taking
the warning and Retry button out from under you in the same instant Finish completed. The fix keeps
you looking at the show you just finished by following it to whichever list it now belongs in,
instead of silently swapping your view.

### 3. Historical show inspection

- Selecting a date with only one already-finished show now shows its details immediately — no second
  click required. Dates with more than one show are unaffected (each remains individually
  clickable, nothing is guessed).
- The copy now reads: **"This show has already been printed, so no new print requests can be
  added."** with **"You can still review your print activity for this show."** underneath. The old
  "read-only show" wording is gone everywhere it appeared.
- For a finished/full/past show, the "N spots remaining" line no longer appears (since no more
  spots can be used there) — the "Your print spots: X of Y used" line remains for reference. Open
  shows are unaffected and still show both lines.

## Automated verification already performed (do not re-run these yourself)

- `npx tsx --test` across the full affected surface — **218/218 pass, exit 0** (80 new/changed tests
  for this pass, 138 full-goal regression tests confirming nothing from any prior amendment broke).
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
- `npm run build:portal` — **exit 0** (19/19 pages).
- `npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing errors, none
  attributable to this pass.
- `npm run lint` — **exit 1**, confirmed still exactly 41 pre-existing problems, none new.
- `git diff --check` — exit 0.
- Confirmed: no Function deployment, no Rules deployment, no production action occurred.

---

## What you need to test (only what genuinely requires a live session)

### Test 1: Finish, with no unexplained retry warning where avoidable

1. Start, Pause, Resume, Finish a production run as before.
2. Confirm the production lifecycle and mounted Portal progress still work exactly as before (no
   regression).
3. If a retry warning appears, **stay on the page and watch it** — this is the specific behavior
   that was fixed. Confirm the show you just finished remains visible and selected, and its warning/
   Retry button remain visible (do not silently vanish or switch to a different show).

### Test 2: Retry, if a warning appears

1. Click Retry once.
2. Confirm it now visibly enters "Retrying…", disables against repeat clicks, and produces either a
   success (warning clears) or a clear, mapped failure/remediation message.
3. Capture the sanitized console object:
   `[useShowProductionTimer] request reconciliation retry result`
   and paste it in your response — this may now include a specific "assignment invariant" detail if
   that's the cause; if so, we can act on it directly.

### Test 3: historical show inspection

1. Select a calendar date with exactly one already-finished show.
2. Confirm its read-only details appear immediately, without an extra click.
3. Confirm the copy reads "This show has already been printed, so no new print requests can be
   added." with the supporting sentence beneath it.
4. Confirm "Your print spots: X of Y used" appears but no "N spots remaining" line for this show.
5. Select an open, allocatable show and confirm both lines still appear there, and Add to Show still
   works normally.

### Test 4: brief regression smoke

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

Do not sign off or begin either queued goal
(`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`) before the owner
response.
