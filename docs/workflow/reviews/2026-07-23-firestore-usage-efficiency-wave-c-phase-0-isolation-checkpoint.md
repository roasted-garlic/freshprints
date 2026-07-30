# Firestore Usage Efficiency Wave C — Phase 0 Owner Smoke Checkpoint

Date: 2026-07-23  
Status: **PASS — PHASE 0 `passed_with_notes`**  
Expected duration: approximately 5 minutes  
Firebase target: `fresh-prints-dev`

## Failed owner smoke (authoritative)

- Window: approximately 4:19 PM–4:34 PM CT.
- Firebase started at rounded `34K` / `67.9%` and ended at rounded `36K` / `71.7%`.
  This is a visible rounded increase of about `2K` / `3.8` percentage points across the entire
  idle-plus-navigation run. It is not attributed entirely to Inbox idle and is not an exact count.
- The trace showed Inbox initial listener emissions at about `21:19:23.671Z`, followed by no
  database activity until navigation at about `21:35:17.370Z`; Inbox idle itself was quiet.
- Print Requests failed: Chromium reported `Throttling navigation to prevent the browser from
  hanging`, and the page froze. The current-source mapped site was `PrintRequestsPage.tsx:407`.
- The final trace at `2026-07-23T21:37:12.635Z` on `#/inbox` had 7 current/peak listeners and no
  duplicate active signatures. Strict Mode produced the expected attach/detach replay.
- Tags represented one logical corpus load (three pages: `500 + 500 + 122 = 1,122`), not three
  duplicate corpus loads. Categories returned 18 and later taxonomy consumers were cache hits.
- The owner smoke therefore **failed** and Phase 0 remained blocked. Chromium IPC flooding
  protection was not and must not be disabled.

## Developer remediation evidence

- Test A: all known clients/runtimes closed from 1:54 PM to 2:30 PM CT; Firebase remained visibly
  unchanged at `17K` / `34.7%`. No other sessions were found.
- Owner pre-fix route trace: approximately 22,440 returned tag documents plus repeated taxonomy,
  design, and AI-count starts; populated Print Requests produced Chromium navigation throttling.
- Print Requests now derives tab and request selection from the URL, uses one route commit helper,
  and has exactly one URL-normalization effect. Competing local tab/selection writers were removed.
- A real authenticated Electron development run completed 20 tab transitions (five cycles),
  populated Working, empty Queued/Printing/Printed, and browser back/forward. It remained responsive
  with zero navigation-throttling warnings and zero page/console errors.
- The same run measured one cold Design Library load: categories `18`, one logical tag corpus
  (`3` pages / `1,122` documents), and one bounded design page (`80`). AI Review started exactly one
  active processing page plus three aggregate counts; it did not preload inactive pages.
- Print Requests, Imports, Show Queue, and Inbox produced no taxonomy/catalog query starts.
- A controlled 60-second Inbox idle produced zero trace events; listeners stayed `7 -> 7` with no
  duplicate active signatures. The fake-clock cache test also advances 30 minutes without work.
- Taxonomy caches now live for 12 hours, are scoped by Firebase project and caller ID, share
  in-flight loads, trace retry after failure, and clear on writes and authentication changes.
- The primary status-tab owner retest passed but did not cover the secondary Working filters. The
  remaining Active/Stale-after-Empty/All defect was reproduced and fixed without new Firestore work.
- Corrected focused verification passes 46/46; changed-file lint and Studio Vite renderer/main/preload
  build pass.
- Studio renderer/Electron/preload Vite build, Portal typecheck, Functions build, changed-file lint,
  and `git diff --check` pass.

No second Portal `/help` idle test, route matrix, or five manual navigation cycles is required.

## One targeted owner checklist

1. From the repository root start Studio:

   ```bash
   npm run dev:studio
   ```

2. Open **Print Requests → Working**.
3. Select a request under **Empty** or **All**, then click **Active**.
4. Return to **Empty** or **All**, then click **Stale**.
5. Repeat once starting from **All**.
6. Confirm:
   - Active opens and does not immediately revert
   - Stale opens and does not immediately revert
   - no `Throttling navigation to prevent the browser from hanging` warning
   - no frozen page
   - the user can leave Print Requests
7. Return PASS/FAIL for those six checks. No Firebase reading or trace copy is required for this
   narrow local-state regression retest.

Keep Portal tabs/server, Cloudflare, emulators, imports, local Functions, tests, and other Fresh
Prints sessions closed during this one test. Do not disable Chromium navigation protection.

## Decision rule

- Pass when Active and Stale remain selected after Empty/All and there is no navigation warning or
  freeze: amend containment verdict to
  `passed_with_notes` (the note is Firebase display rounding/reporting delay).
- Navigation throttling, frozen/reloading UI, repeated loading loop, duplicate active signatures,
  or repeating idle taxonomy/design starts: keep Phase 0 blocked and remediate the measured source.

Do not run the controlled 10–20 design import until this smoke checkpoint passes.

## Corrected owner retest result

Owner result: **PASS** on all six checks.

- Active opened and stayed selected.
- Stale opened and stayed selected.
- No navigation-throttling warning.
- No frozen page.
- No unexpected reload or repeated loading loop.
- Print Requests could be left normally.

Phase 0 is complete. The `passed_with_notes` note is limited to Firebase dashboard rounding and
reporting delay during the earlier broad smoke; it is not an unresolved client read or routing defect.
