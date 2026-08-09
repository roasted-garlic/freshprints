# Attribution: Firestore read spike ~2026-08-07 4:42 PM CDT (Stage 4 post-delete)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Mode | **Read-only** — no code / deploy |
| Project | `fresh-prints-dev` |
| Window (UTC) | `2026-08-07T21:38:00Z` – `21:48:00Z` (focus **21:40–21:45**) |
| Window (Central) | ~4:38–4:48 PM CDT (spike ~**4:42 PM**) |
| Context | Stage 4 publishers already deleted; owner edited ready design during post-delete QA |
| Source | Cloud Logging (`gcloud logging read`) |

---

## Verdict

| Question | Answer |
|----------|--------|
| Exact driver of ~**1.4K** Console reads? | **Not** a portal-catalog full publication. **Not** AI Functions taxonomy cold load. Dominant class is **client-side Studio taxonomy hydrate** (tags ≈1.1K + categories ≈18 + other Studio/design reads), coinciding with the design edit. Algolia sync is a **tiny** concurrent cost only. |
| AI taxonomy cold load? | **No** — zero `taxonomy-cache-miss` / `taxonomy-load-success` in Functions logs for 21:35–21:50Z |
| Studio taxonomy hydrate likely? | **Yes** — only material explanation for ~1.4K with no server full-scan / publisher / AI taxonomy logs; magnitude matches prior ~**1139** taxonomy doc class (P3/P2 notes) |
| Retired publisher full-pub? | **Confirmed absent** — zero logs from all six retired Functions; no ~120s repeat spikes |
| Affects Stage 4 **NO PUB SPIKE** acceptance? | **No blocker** — criterion targets retired **portal-catalog full-publication** class. That class did **not** occur. Single ~1.4K Studio-taxonomy-class spike is expected/known residual, not Stage 4 publisher regression. |

---

## 1. `syncPortalCatalogDesignToAlgolia`

| Field | Value |
|-------|-------|
| Timestamp | **2026-08-07T21:42:17.525Z** = **4:42:17 PM CDT** |
| Message | `algolia-portal-catalog-upsert` |
| Design | `vEUrzV9KjCFcCMZI3o3i` |
| Index | `portal_catalog_ready_dev` |
| `tagCount` | **2** |
| Revision | `syncportalcatalogdesigntoalgolia-00002-giw` (post Stage 4 redeploy) |
| Instance | cold start ~21:42:12 (AUTOSCALING) → upsert ~21:42:17 |

**Reads (code-path):** event design snapshot + per-tag `tags/{id}` gets (≤2 tokens, possibly +slug) + optional `categories/{id}` get → **O(low single digits)**, not hundreds/thousands.

**Confirmed:** per-design sync only. **Cannot** explain ~1.4K.

---

## 2. AI taxonomy

| Check | Result in window |
|-------|------------------|
| `taxonomy-cache-miss` | **None** |
| `taxonomy-load-success` | **None** |
| `documentCount` / `coldStart` / instance | **N/A** — no taxonomy load events |
| AI enrich Functions activity | **None** observed in Cloud Run services for 21:40–21:45 |

**AI taxonomy cold load did not contribute** to this spike.

---

## 3. Studio / taxonomy collection activity

Not directly visible as Cloud Function logs (client SDK). Inference:

- Spike timing aligns with owner **Studio ready-design edit** + Algolia upsert of same design id used in prior Stage 1b work.
- Magnitude **~1.4K** ≈ prior measured taxonomy load **`documentCount: 1139`** (1121 tags + 18 categories) plus ordinary Studio design/listener overhead.
- Amendment 9 **P2** already accepted Studio tag-library hydrate as fixed cost (~1.1K); P3 only contained **Functions** AI taxonomy cold loads.

**Studio taxonomy hydrate is the likely material driver.** Exact Console tag-vs-category split not available without client tracing / Usage detail beyond Functions logs.

---

## 4. Retired publishers — ZERO activity

Queried Cloud Run / Function activity 21:38–21:48Z for publisher names. **Only** service with logs in the spike minute:

- `syncportalcatalogdesigntoalgolia`

**Zero** executions / logs for:

- `onCategorySnapshotSourceWritten`
- `onTagSnapshotSourceWritten`
- `onPortalCatalogSnapshotSourceWritten`
- `onPortalCatalogPublicationStateWritten`
- `rebuildCatalogSnapshots`
- `retryPortalCatalogPublication`

Also: **no** `portal-catalog` publication success rows, **no** `claimed-debounce-waiter`, **no** C+T+R accounting, **no** ~120s follow-on spikes (owner observation matches).

---

## 5. Other Functions in the minute

| Service | Role | Firestore impact |
|---------|------|------------------|
| `syncPortalCatalogDesignToAlgolia` | Per-design upsert | Tiny |
| *(none other)* | — | — |

No reconcile callable/scheduled activity in this window.

---

## Stage 4 NO PUB SPIKE acceptance

| Criterion | Result |
|-----------|--------|
| No retired portal-catalog **full publication** (~1.1K C+T+R pub class, ~120s cadence) | **PASS** |
| Single ~1.4K spike after design edit | **Attributed** to Studio taxonomy hydrate class + tiny Algolia sync — **not** a publisher regression |
| Recommend for post-delete checklist item (2) | Accept as **`NO PUB SPIKE: PASS`** (publisher class) with note that Studio ~1.1K taxonomy hydrate may still appear on edit |

---

## STOP

Read-only attribution complete. No code changes. No deploy. Stage 5 not started.
