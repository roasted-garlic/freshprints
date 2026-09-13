# Owner QA Checkpoint: Studio history newest-first ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-history-newest-first-ordering` |
| Environment | local Studio (`npm run dev:studio`) against DEV |
| Status | **PASS** |
| Recorded | 2026-09-02 (owner final closeout) |

---

## Prerequisites

1. Restart Studio if it was already running so renderer picks up the History sort change:
   ```bash
   npm run dev:studio
   ```
2. Sign in as staff who can open Internal Gang Sheets and Show Queue.
3. Prefer data with at least two completed Internal Gang Sheets (e.g. Cycle 4 and Cycle 5) and multiple Upcoming/Past Whatnot shows.

---

## Manual Test Checkpoint

**Feature / area:** Studio list ordering — Internal Gang Sheet History; Past/Upcoming regressions  
**Why automated tests are insufficient:** Visual rail order and real Firestore chronology  
**Environment:** local / DEV  
**Prerequisites:** see above  

### Steps

#### A — Internal Gang Sheet History

1. Open **Internal Gang Sheets** → **History**  
   → **Expected:** Most recently completed sheet at the **top**; older below; oldest at bottom.  
   Example: if Cycle 5 finished after Cycle 4, **Cycle 5 appears above Cycle 4**.

#### B — Current

2. Open **Current** tab  
   → **Expected:** Same behavior/order as before this change (active sheet(s) only; History sort not applied).

#### C — Past Shows

3. Open **Show Queue** → **Past**  
   → **Expected:** Newest past show (by schedule) still first — no regression.

#### D — Upcoming Shows

4. Open **Show Queue** → **Upcoming**  
   → **Expected:** Soonest upcoming first (`scheduledStartAt` ascending) — **must not reverse**.

### Pass criteria

- [x] A — History newest-first by completion
- [x] B — Current unchanged
- [x] C — Past still newest-first
- [x] D — Upcoming still soonest-first

### Owner result

**PASS** — owner verified History newest-first (`printFinishedAt` chronology), Current unchanged, Past newest-first, Upcoming soonest-first. Local/DEV only; not production.

---

## Out of scope for this QA

- Production deploy  
- Functions / rules / indexes  
