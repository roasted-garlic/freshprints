# Manual Test Checkpoint — Remediation r6

**Feature / area:** Portal request UX polish + past show calendar  
**Environment:** local Portal/Studio + **fresh-prints-dev**  
**Prerequisites:** Soft-refresh Portal after pull; Studio reload for Add to Show

### Steps

1. **Aspect lock** — Attach an uploaded design; change Width → Height updates locked; change Height → Width updates.
2. **Badge / height** — Mix library + uploaded cards; uploaded shows corner **Uploaded** badge; row controls align (no extra subtitle).
3. **Selection upload** — Continue request → selection mode shows upload copy + **Upload artwork** CTA → opens request with upload panel; sticky back says **Print Request**.
4. **Empty state** — Empty request copy mentions upload + library; on mobile, buttons stack full-width.
5. **Past calendar (Portal)** — Add to show: past days in last ~2 months show a marker but are not clickable; only future/open days select slots.
6. **Past calendar (Studio)** — Add to Show modal: same past-day highlight behavior; cannot allocate to past.

### Pass criteria

- [ ] Items 1–6 behave as expected
- [ ] Past shows remain non-allocatable

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
