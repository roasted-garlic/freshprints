# Manual QA Checkpoint — Auto Background Detector C2

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Feature | Import Auto artwork-background detector (false-positive corrective) |
| Environment | local Studio → **fresh-prints-dev** |
| Why automated tests are insufficient | Owner-labeled real PNGs are not in-repo; product judgment is visual |

**[NEEDS OWNER FIXTURE]** — use the real PNGs from the owner QA batch (chat-uploaded assets). Do not invent repo paths.

---

## Prerequisites

1. Studio running against **fresh-prints-dev** (`npm run dev:studio` if needed).
2. Restart Studio / hard-reload after pull so Electron picks up shared detector changes.
3. Session background mode = **Auto** (not All Light / All Dark).
4. Halftone session = **Normal** unless testing override #14–15.

---

## Steps

### Auto detection (session Auto)

For each design below: import or re-preview under **Auto** → note Auto-resolved mat label (Light / Dark).

| # | Artwork | Expected Auto | Pass? |
|---|---------|---------------|-------|
| 1 | Cream/light **poodle** (prior true positive) | **Dark** | ☐ |
| 2 | Daddy Is My Hero / thin-blue-line | **Light** | ☐ |
| 3 | Porch Goose Social Club | **Light** | ☐ |
| 4 | Pennywise / You'll Float Too | **Light** | ☐ |
| 5 | Uncle Sam cannabis | **Light** | ☐ |
| 6 | Dense white/stipple character artwork | **Light** | ☐ |
| 7 | White illustrated character group | **Light** | ☐ |
| 8 | Frankenstein / dandelion | **Light** | ☐ |
| 9 | Sativa / Indica cannabis | **Light** | ☐ |
| 10 | Cannabis heart | **Light** | ☐ |
| 11 | Peace / Cannabis | **Light** | ☐ |
| 12 | 420 hearts | **Light** | ☐ |
| 13 | 99 / 420 | **Light** | ☐ |
| 14 | Gamer controller | **Light** | ☐ |
| 15 | Seattle / Jimothy raccoon variants | **Light** | ☐ |
| 16 | Pink Good Vibes | **Light** | ☐ |
| 17 | Grinch + Max | **Light** | ☐ |

### Overrides (must still work)

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 18 | Per-image quick picker → Light or Dark on any Auto sample | Override wins; preview updates | ☐ |
| 19 | Session **All Halftones** (human) with Auto bg | Background → Dark; Halftone set | ☐ |
| 20 | Auto Dark result alone | Does **not** imply Halftone | ☐ |

---

## Pass criteria

- [ ] Cream poodle → Auto Dark
- [ ] Listed false-positive family → Auto Light
- [ ] Pink Good Vibes + Grinch+Max → Light
- [ ] Per-image override works
- [ ] All-Halftone human path still darkens bg + sets halftone
- [ ] Dark never implies Halftone by itself

---

## Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

---

## Hard stop reminder

Do **not** treat synthetic unit tests as final. Do **not** start Slice 5 / sign off refinement until this checkpoint clears (C1 Highland remains separate/open).
