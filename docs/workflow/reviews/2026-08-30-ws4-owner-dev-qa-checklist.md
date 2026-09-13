# WS4 Owner DEV QA Checklist — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `customer-account-identity-management-ws4-customer-activity-and-deep-linking` |
| Environment | `fresh-prints-dev` — Studio (`npm run dev:studio`) |
| Production | **NOT AUTHORIZED** |

---

## Prerequisites

- Studio `.env.local` → `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`
- Staff account with `canViewUsers` + `canViewPrintRequests`
- User Management → open **User Info** modal for each fixture customer below

---

## Information architecture acceptance

### Customer summary header

- [ ] Summary tiles show **Print Requests**, **Queued to Show**, **Account Activity** (not "Recent Events")
- [ ] Counts are plausible for fixture customer

### Print Request History (primary surface)

- [ ] Flat **Recent Activity** feed is **not** the primary customer-history view
- [ ] One compact card per logical Print Request (initial page ≤ 15)
- [ ] Card shows when available: name, lifecycle badge, origin, show name + scheduled date/time, created, design count, last activity
- [ ] **Card body click** opens Details (does not navigate away unexpectedly)
- [ ] **Open Print Request** is an explicit action with correct deep link tab for request state

### Print Request Details (lazy)

- [ ] Detail opens on demand; bounded event list
- [ ] Created / Queued to show / conversion milestones appear when persisted
- [ ] **Scheduled show time** is distinct from **Queued to show** (allocation created) time
- [ ] Merged attribution appears in Details only (subtle), not cluttering every card

### Account Activity (secondary)

- [ ] Separate section from Print Request history
- [ ] **Collapsed by default**
- [ ] Expand shows identity events: username change, Transfer Username, Merge Accounts, disable/restore, etc.

---

## Fixture scenarios

### 1. Normal customer with several Print Requests

- [ ] Cards sorted by recent activity
- [ ] Pagination / load-more if >15 requests

### 2. Customer request allocated to a show

- [ ] Show name visible on card
- [ ] Scheduled show date/time from current `upcomingShows.scheduledStartAt`
- [ ] Open Print Request deep link opens correct Working/Queued tab

### 3. Converted CR → IR pair

- [ ] Original Customer Request card remains visible
- [ ] Shows **Converted to Internal Request** with link to IR
- [ ] IR opens via explicit action; CR not collapsed away

### 4. Merged survivor (WS3)

- [ ] History includes requests from merged source customer ids
- [ ] One card per logical request (no duplicates)
- [ ] Merged attribution in Details where useful

### 5. Transfer Username history

- [ ] Appears under **Account Activity**, not mixed into PR cards as primary feed

### 6. Merge Accounts history

- [ ] Appears under **Account Activity**

### 7. Older PR without forward audit events

- [ ] Request still appears (reconstructed from Print Request + allocation records)

### 8. Customer with >15 requests (if practical)

- [ ] Initial load bounded; load-more works; modal remains usable

### 9. Did Not Print → requeue (Show Queue compatibility)

Use a request that went through Move unprinted to another show (or equivalent DEV fixture):

- [ ] **One** logical PR card (no duplicate from `requeuedFromAllocationId`)
- [ ] Card show context reflects **current destination** show/date (not canceled missed show as active schedule)
- [ ] **Print request Details** (click card body) shows timeline entries:
  - [ ] **Originally queued to show · Did not print** (missed source show)
  - [ ] **Moved to another show** (destination after requeue)
- [ ] Needs Re-queue staff metadata does not redefine customer lifecycle badge incorrectly

**Note:** Show queue history belongs in **Print Request History → Details**, not in collapsed **Account Activity** (identity events only).

---

## Deep link verification

For each applicable fixture, confirm **Open Print Request** opens correct route (not hardcoded single tab):

- [ ] Draft Customer Request
- [ ] Queued Customer Request
- [ ] Completed/archived request
- [ ] Internal Request
- [ ] Converted CR/IR pair (both links if offered)

---

## Permissions

- [ ] User Info modal requires appropriate staff permissions
- [ ] WS4 sections respect `canViewPrintRequests` / show read permissions
- [ ] Owner-only actions (Merge, Transfer Username, Edit Show) do not make entire WS4 owner-only

---

## Pass criteria

Reply with one of:

- **`PASS`** — all applicable criteria met
- **`FAIL: [description]`** — blocking issue(s)
- **`PASS WITH NOTES: [notes]`** — acceptable with documented follow-ups

---

## After owner PASS

Agent will: reconcile tests → final Implementation Review (if needed) → Signoff → ROADMAP/state update. **Production remains NOT AUTHORIZED.**
