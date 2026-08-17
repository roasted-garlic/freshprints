# DEV data repair: TD-030 QA — non-portal Working Request

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Project | `fresh-prints-dev` only |
| Production | untouched |
| Functions / Rules | not changed |

---

## Confirmed discriminator

Owner: `DEV TD-030 DISCOVER DISCRIMINATOR: FAILS SAME WAY`

Discover/catalog Add shows the same “cannot be edited from the portal” message and does not persist. TD-030 share wiring did not cause the persist failure.

---

## Root cause (data)

Customer `roasted_garlic` (`clv0GIjfRp1Gf7GO7yqs`) had one continuable print request:

| Field | Value |
|-------|-------|
| id | `XlqFwbSoO0ZlAXMiDk8N` |
| name | `roasted_garlic-CR001` |
| status | `editing` |
| requestOrigin | `studio_customer` |
| isInternal | `false` |
| itemCount | `0` |

Portal chrome listed it as the Working Request (status-only). Catalog add callables correctly rejected it (origin ≠ `portal_customer`).

---

## Repair applied (Admin SDK on DEV)

**Action:** Archive the Studio-created continuable request so Portal no longer treats it as Working Request. Next Add can create a new `portal_customer` draft via the existing create path.

| Field | Before | After |
|-------|--------|-------|
| status | `editing` | `archived` |
| previousStatus | — | `editing` |
| queueTab | `working` | `printed` (valid enum; not rewritten to invalid `archived`) |
| requestOrigin | `studio_customer` | **unchanged** |
| isInternal | `false` | **unchanged** |
| archivedBy | — | `dev-data-repair:td-030-qa` |
| repairNote | — | TD-030 DEV QA archive note |

**Explicitly not done:**

- No Function / Rules change
- No `requestOrigin` rewrite to fake Portal ownership
- No TD-030 application code change for this repair
- No production touch

**Post-repair check:** customer `clv0GIjfRp1Gf7GO7yqs` has **0** `draft`/`editing` print requests.

---

## Retest expectation

After hard refresh of localhost Portal (clear any stale chrome cache):

1. Continuable Working Request should be empty / virtual.
2. Discover Add should create a `portal_customer` Working Request and persist.
3. Re-run full TD-030 owner QA (Details + share).

Checkpoint: `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-dev-qa-checkpoint.md`
