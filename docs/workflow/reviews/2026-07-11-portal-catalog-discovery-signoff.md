# Signoff: Portal Design Library discovery sections

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Verdict | **pending_human** — code complete; await deploy + manual QA |

## Delivered

- Discovery rails: New This Week, Popular, Recently Requested (browse + selection)
- View All via `?discover=` in-library filter/sort
- My requests removed from Design Library header
- Catalog maps `createdAt` / `requestCount` / `lastRequestedAt`
- Shared ranking helpers + tests
- `onPrintRequestItemCreated` trigger; Studio client double-increment removed
- ADR-FP-072 + DATA_MODEL / TESTING notes

## Manual Test Checkpoint

**Feature / area:** Portal catalog discovery  
**Environment:** local Portal + deployed `onPrintRequestItemCreated` on fresh-prints-dev  

### Steps
1. Open `/catalog` → see discovery rails; no My requests button  
2. View all on each section → URL `discover=` set; rails hidden; sort/filter correct  
3. Back to discovery clears mode  
4. Selection mode shows same rails  
5. Add a design from Portal → after deploy, design `requestCount` / `lastRequestedAt` update  

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

## Deploy

```bash
firebase deploy --only functions:onPrintRequestItemCreated --project fresh-prints-dev
```
