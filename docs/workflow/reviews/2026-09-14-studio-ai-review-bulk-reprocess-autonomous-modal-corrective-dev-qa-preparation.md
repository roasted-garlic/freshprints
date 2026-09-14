# DEV QA preparation — Studio 1.0.12 corrective

Date: 2026-09-14
Status: **READY FOR OWNER QA**

The current development checkout contains the bounded renderer implementation and automated checks.
It has not been published as Studio 1.0.12 and does not mutate published Studio 1.0.11.

## Manual checklist

1. In AI Review → Needs Review, select three eligible designs and click `Reprocess Selected`.
   Confirm serial progress, each accepted row leaves the rail immediately, the active selection
   settles once, and no tab refresh/navigation is needed.
2. Repeat rapid single `Reprocess` on adjacent designs. Confirm no ghost cards return; switch to
   Processing only to confirm the backend lifecycle, then return to Needs Review.
3. Force or observe one bulk failure. Confirm successes leave the rail, the failed row remains
   selected/available, and the result lists its ID/reason. Confirm no duplicate request on a repeat
   click while running.
4. Verify Header Auto and Auto Advance remain independent and unchanged.
5. Settings → Catalog Processing Mode → Autonomous (live gate off): open the confirmation modal at
   normal, narrow, and resized window dimensions. Confirm the panel is centered in the application
   viewport, backdrop/keyboard/Escape behavior works, and focus starts in the phrase input.
6. Click Copy beside `ENABLE AUTONOMOUS`; confirm clipboard text is exactly that phrase, button
   temporarily says `Copied`, and the input remains empty/manual. Enable stays disabled until the
   exact phrase is typed.

Production resources, settings, releases, and Autonomous/Pass 2 policy were not changed in this
phase.
