# Owner QA Checkpoint (retest): Pocket / Full Size corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-history-newest-first-ordering` |
| Amendment | `print-request-pocket-fullsize-counts` |
| Status | **PASS** |
| Environment | `npm run dev:studio` / DEV |
| Recorded | 2026-09-02 (owner final closeout) |

Restart Studio if already running.

### A — Exact request from screenshot
Expected one pill: **Pocket 10 · Full Size 3** (at 4″ Show Queue cutoff).  
**Result:** PASS

### B — Scrolling
No inner vertical scrollbar in request details; only normal outer page scroll; detail content fully reachable.  
**Result:** PASS

### C — Show Queue card
Same width-only totals; compact one-line / one-pill presentation.  
**Result:** PASS

### D — Internal Gang Sheet
Width-only rule with Internal cutoff (`settings/internalGangSheet`).  
**Result:** PASS

### E — History regression
History newest-first; Past newest-first; Upcoming soonest-first; Current unchanged.  
**Result:** PASS

### Owner verified (closeout)

- [x] Pocket / Full Size uses width-only classification (height ignored)
- [x] Counts use total print quantity (not row count)
- [x] Owner fixture = **Pocket 10 · Full Size 3**
- [x] One compact pill (`Pocket N · Full Size M`)
- [x] Show vs Internal configurable cutoffs
- [x] Nested Print Request detail scrollbar removed; outer scroll restored
- [x] History / Current / Past / Upcoming ordering as above

### Overall

**PASS** — corrective retest approved. Local/DEV only; not production.

Reply recorded: `PASS`
