# Manual Test Checkpoint — r7 upload limits / speed / confirmations / DPI

**Feature / area:** Portal customer upload + Studio intake visibility  
**Why automated tests are insufficient:** Limits, copy, DPI layout, and processing feel need human judgment  
**Environment:** Portal + Studio against **fresh-prints-dev**  
**Prerequisites:** Signed-in Portal customer; Studio staff with Customer Uploads access

### Steps

1. Open Upload artwork on a working request → **Expected:** near-fullscreen modal; confirmation copy matches approved wording; library permission **checked by default**.
2. Uncheck library permission; check ownership; attach ready file(s) → **Expected:** attach succeeds.
3. In Studio Customer Uploads → select that upload → **Expected:** “Design Library permission: Declined…” callout visible; **Send to AI Review** still available.
4. Upload 5+ images at once → **Expected:** more than 3 process in parallel (up to 8); batch accepts many files (cap 100).
5. Try a file just under 100 MB (if available) and one over 100 MB → **Expected:** under accepted; over rejected with size in the message.
6. After attach, open request item → **Expected:** default width near **10″**; **DPI** shown under size inputs without layout redesign; enlarge until soft warning then hard error when DPI too low.
7. Add a catalog design to the same request → **Expected:** DPI also shown for library items.

### Pass criteria

- [ ] Limits and concurrency feel correct
- [ ] Confirmations behave (ownership required; library optional default-on)
- [ ] Studio shows library decline without blocking promote
- [ ] 10″ default + DPI display / warnings OK for upload and library items

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  
