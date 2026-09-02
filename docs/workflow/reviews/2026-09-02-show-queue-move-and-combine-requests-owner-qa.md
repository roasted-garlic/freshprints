# Owner QA Checkpoint: Show Queue Move / Combine Requests

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `show-queue-move-and-combine-requests` |
| Environment | **fresh-prints-dev** only |
| Production | **NOT AUTHORIZED** |
| Owner QA | **PASS** |
| Status | **COMPLETE** |

---

## Owner QA result

**Owner QA: PASS**

**Environment:** DEV only (`fresh-prints-dev` + local Studio)

Owner verified the DEV workflow for:

- moving an individual Print Request between shows
- moving from the Print Request detail
- combining quantities when the same PR/item already exists in destination
- moving an entire Show Queue
- all-or-nothing blocker behavior
- printing destination protection
- capacity protection
- request state preservation
- normal move behavior distinct from Did Not Print recovery

### Verified checklist

| Item | Result |
|------|--------|
| Individual move from Show Queue | PASS |
| Move from Print Request detail | PASS |
| Same PR/item destination combine | PASS |
| Exact quantity behavior (e.g. dest 3 + move 5 → effective 8) | PASS |
| Whole-show Move All | PASS |
| All-or-nothing blockers | PASS |
| Printing destination protection | PASS |
| Capacity protection | PASS |
| Request remains Queued | PASS |
| Source/destination totals correct | PASS |
| No cloned Print Request | PASS |
| No production deployment | PASS |

### Pass criteria

- [x] A–L all met

### Owner reply

`PASS`

---

## Manual Test Checkpoint (original)

**Feature / area:** Show Queue Move to Another Show + Move All Requests  
**Why automated tests are insufficient:** Staff UI flows, combine rendering, show totals, and blocker UX need human verification on DEV fixtures.  
**Environment:** local Studio (`npm run dev:studio`) against `fresh-prints-dev`  
**Prerequisites:** DEV Functions `previewShowQueueMove` / `applyShowQueueMove` deployed; Firestore Rules with `movedFromAllocationId` deployed; staff login.

### Fixture setup (owner or Cursor-assisted)

Create two disposable DEV Whatnot shows (or `DEV-OVERRIDE` fixtures):

| Show | Role |
|------|------|
| **SHOW A** | Source |
| **SHOW B** | Destination (pre-production / open; not printing) |

| Request | Setup |
|---------|--------|
| **PR1** | Only on A — known qty (e.g. 4) |
| **PR2** | Split: A has 5 of an item; B already has 3 of same item |
| **PR3** | Only on A — known qty (e.g. 2) |
| **PR4** (optional) | Non-movable allocation (`in_progress` / `printed` / `done`) on A for all-or-nothing test |

### Steps / expected

#### A — Individual move from Show Queue
1. Show A → PR card ⋯ → **Move to Another Show** → pick B → confirm preview → Move.  
   **Expected:** Leaves A if fully moved; one grouped card on B; totals exact; no restart.

#### B — Print Request detail
2. Open a PR with per-show groups → Move on selected source only.  
   **Expected:** Other shows untouched (e.g. A→B leaves C alone).

#### C — Same PR already in destination (CRITICAL)
3. Move PR2 A(5) → B(already 3).  
   **Expected effective B = 8** (not 3, 5, 13, or 16).

#### D — Source history / lineage
4. After move, Cursor/DEV inspection: source **canceled**, dest has **`movedFromAllocationId`**, **not** `requeuedFromAllocationId`.

#### E — Move All Requests
5. Show A ⋯ → **Move All Requests…** → B.  
   **Expected:** Atomic move of all eligible; A totals correct (often 0); B combined; A show status unchanged (not DNP/complete).

#### F — All-or-nothing blocker
6. With PR4 non-movable on A → Move All.  
   **Expected:** Preview blockers; Apply disabled/blocked; nothing moved.

#### G — Printing destination
7. Printing show must not appear as destination; server rejects if forced.

#### H — Capacity
8. Over-capacity destination → preview blocks; no partial move. Exact fill allowed.

#### I — Idempotency
9. Covered by automated checksum/application tests; retry must not double (Cursor reports).

#### J — DNP regression
10. Normal move must not set `needsStaffRequeue*` / DNP markers / `requeuedFromAllocationId`.

#### K — Add / Remove regression
11. Spot-check Add to Show + Remove from Show unchanged.

#### L — Print Request state
12. Same PR id; remains Queued when dest has active allocs; not briefly Working.

---

## DEV deploy already completed (for owner context)

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Functions | `previewShowQueueMove`, `applyShowQueueMove` — **created successfully** |
| Firestore Rules | **YES** — additive `movedFromAllocationId` only |
| Storage / indexes / Portal / prod | **NO** |
| Callable smoke | Reachable → `UNAUTHENTICATED` without auth (not not-found) |
| Studio | Restarted `npm run dev:studio` after deploy |
| Production | **NOT AUTHORIZED** |
