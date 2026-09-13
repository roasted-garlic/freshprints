# Priority Delete Surface Audit — Scope Addendum

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Status | **[PLAN AMENDMENT REQUIRED]** for Design Library image purge coverage |
| Related | Plan + Implementation already landed; Internal Gang Sheets confirmed same path as Upcoming Show |

---

## Compact matrix (owner’s four priorities)

| Surface | Delete exists | Preview / dependency check | Preview callable | Mutation callable | Cold-start exposure | Covered by proposed/current warmup |
|---------|---------------|----------------------------|------------------|-------------------|---------------------|-------------------------------------|
| **Print Request delete** | Yes | Yes — dialog “Checking dependencies…” | `previewPrintRequestDeletion` | `deleteEligiblePrintRequest` / `archivePrintRequest` | Separate Gen2 services for preview vs mutate | **Yes** (idle preview + dialog mutate warms) |
| **Upcoming Show delete** | Yes | Yes | `previewUpcomingShowDeletion` | `deleteEligibleUpcomingShow` | Separate Gen2 preview vs mutate | **Yes** |
| **Internal Gang Sheet delete** | Yes | Yes (same dialog) | `previewUpcomingShowDeletion` | `deleteEligibleUpcomingShow` | **Same services as Upcoming Show** (not a distinct Gen2 pair) | **Yes** (already covered; no extra callable) |
| **Design delete (AI Review permanent)** | Yes | Server-side inside mutate (no separate preview Gen2) | *(none)* | `deleteEligibleUnapprovedDesign` | Single Gen2 service | **Yes** (idle + dialog open warm) |
| **Design Library archive** | Yes (soft status) | No CF dependency-search dialog | *(none)* | Client `designService.archiveDesign` (Firestore write) | **No Gen2 cold start** | **N/A** — local/client; no backend warmup |
| **Design Library permanent image purge** | Yes (“Delete images” on archived) | Client queue check + server recheck on mutate | *(none)* | `purgeArchivedDesignAssets` | **Single Gen2 service — NOT in current warmup set** | **No — GAP** |

---

## Per-surface detail

### 1. PRINT REQUEST DELETE

| Field | Value |
|-------|-------|
| UI entry | Print Requests → request overflow → delete → `PrintRequestDeletionDialog` |
| Service | `printRequestDeletionService` |
| Callables | `previewPrintRequestDeletion`, `deleteEligiblePrintRequest`, `archivePrintRequest` |
| Dependency preview | Yes (server preview) |
| Preview ≠ mutate Gen2 | Yes (3 services) |
| Shared deletion infra | Yes |
| Warmup covers | Yes |

### 2. UPCOMING SHOW DELETE

| Field | Value |
|-------|-------|
| UI entry | Show Queue (`/show-queue`) → overflow **Delete show…** → `UpcomingShowDeletionDialog` |
| Service | `upcomingShowDeletionService` |
| Callables | `previewUpcomingShowDeletion`, `deleteEligibleUpcomingShow` |
| Dependency preview | Yes |
| Preview ≠ mutate Gen2 | Yes |
| Shared deletion infra | Yes |
| Warmup covers | Yes |

### 3. INTERNAL GANG SHEET DELETE

| Field | Value |
|-------|-------|
| UI entry | Internal Gang Sheets (`/internal-gang-sheets`) → same `UpcomingShowsPage` with `queueSurface === "staff_gang_sheets"` → overflow **Delete internal sheet…** → **same** `UpcomingShowDeletionDialog` |
| Service | **Same** `upcomingShowDeletionService` |
| Callables | **Same** `previewUpcomingShowDeletion` / `deleteEligibleUpcomingShow` |
| Dependency preview | Yes (identical) |
| Distinct Gen2 pair? | **No** — reuses Upcoming Show callables |
| Shared deletion infra | Yes |
| Warmup covers | **Yes** — no additional callable; no architecture expansion |

### 4. DESIGN DELETE (disambiguated)

#### A. AI Review — permanent unapproved design delete

| Field | Value |
|-------|-------|
| UI entry | AI Review → overflow **Delete** → `DeleteEligibleUnapprovedDesignDialog` |
| Hook/service | `useDeleteEligibleUnapprovedDesign` → `deleteEligibleUnapprovedDesignService` |
| Callables | `deleteEligibleUnapprovedDesign` only |
| Dependency preview Gen2 | No separate preview; blockers checked inside mutate |
| Warmup covers | **Yes** |

#### B. Design Library — archive (not permanent delete)

| Field | Value |
|-------|-------|
| UI entry | Design Library → archive confirm |
| Service | `useArchiveDesign` → `designService.archiveDesign` |
| Callables | **None** (client Firestore status update) |
| Warmup | **Not applicable** — do not treat as CF cold-start delete |

#### C. Design Library — permanent image purge (“Delete images”)

| Field | Value |
|-------|-------|
| UI entry | Design Library → Include archived → select → purge → `PurgeArchivedDesignAssetsDialog` |
| Hook/service | `usePurgeArchivedDesignAssets` → `purgeArchivedDesignAssetsService` (+ client `findDesignIdsOnActiveShowQueue`) |
| Callables | `purgeArchivedDesignAssets` only |
| Dependency preview Gen2 | No separate preview callable; client Firestore allocation scan + server recheck |
| Cold-start | **Yes** on first purge after idle |
| Current warmup | **Not covered** |
| Required addition | Same-service `{ warmup: true }` on `purgeArchivedDesignAssets` + idle and/or dialog-open warm |

---

## Verdict

- **Internal Gang Sheets:** confirmed delete path exists; **already covered** by Upcoming Show warmup — no plan expansion.
- **Print Request + Upcoming Show + AI Review permanent delete:** covered.
- **Design Library archive:** not a Gen2 first-action problem.
- **Design Library permanent image purge:** owner-priority “design delete” surface with Gen2 cold start **missing from warmup** → narrow same-architecture addendum needed.

### [PLAN AMENDMENT REQUIRED]

Add to v1 warmup (same-service pattern only; still no minInstances/keepalive):

1. `purgeArchivedDesignAssets` — `{ warmup: true }` after owner auth assert  
2. Post-auth idle list (owner + `canPurgeArchivedDesignAssets`)  
3. Dialog-open warm when `PurgeArchivedDesignAssetsDialog` opens  

Does **not** change architecture class; **does** expand approved callable list by one.

**Do not deploy / do not implement this gap until owner approves this amendment.**

Existing implementation for the other three priority surfaces remains valid.
