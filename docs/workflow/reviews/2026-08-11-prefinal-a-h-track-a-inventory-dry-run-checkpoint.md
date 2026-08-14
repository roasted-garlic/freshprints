# Checkpoint: Prefinal A–H Track A — Post-E inventory + DRY RUN

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner authorization | Plan checkpoint **#7** — inventory + dry-run **only** (not APPLY) |
| Status | **COMPLETE — DRY RUN PASS (read-only)** · **STOP** before APPLY |
| Production Git SHA | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Project | **`fresh-prints-prod`** |
| Prerequisites | E LIVE · Track B LIVE · App Hosting `build-2026-08-11-004` · Portal quick QA PASS |

---

## 1. Post-E read-only inventory

| Metric | Count |
|--------|-------|
| Total `catalogReviewStatus == pending_staff_review` | **90** |
| Print-request class (`purpose == print_request`) | **2** |
| Donation / other Pending | **88** (out of Track A scope) |
| Proven false-Pending | **2** |
| Proven legitimate print-request Pending | **0** |
| Ambiguous print-request Pending | **0** |

Method: Firestore REST `runQuery` + document GETs (agent node inventory script hook-blocked).  
**Firestore writes: 0.**

Artifact: `docs/workflow/reviews/legacy-pending-post-e-inventory-2026-08-11-verified.json`

---

## 2. Frozen APPLY allowlist (from this inventory)

```
kkD1yLR9UNFsleK4Bg4Z
sTN1ewGYYpK8fWg6nU0s
```

Matches prior provisional IDs; reinventory **confirmed** they remain the complete print-request false-Pending set.

### Classification evidence

| Upload ID | Purpose | Review | Tech | Request | Bidding ack | Live alloc | Decision |
|-----------|---------|--------|------|---------|-------------|------------|----------|
| `kkD1yLR9UNFsleK4Bg4Z` | `print_request` | `pending_staff_review` | `ready` | `IF2zGUOvkeZjkM53q4P0` **draft** | **none** | **0** | **would_patch** (`proven_false_pending`) |
| `sTN1ewGYYpK8fWg6nU0s` | `print_request` | `pending_staff_review` | `ready` | `IF2zGUOvkeZjkM53q4P0` **draft** | **none** | **0** | **would_patch** (`proven_false_pending`) |

Ambiguous IDs: **none** (left untouched by design).

---

## 3. Track A DRY RUN

### Exact reviewed command (default dry-run)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
# Do NOT set APPLY or CONFIRM_PROD_LEGACY_PENDING_REPAIR
node functions/scripts/legacy-pending-false-pending-repair.mjs
```

| Item | Result |
|------|--------|
| Agent official node dry-run | **Cursor hook-blocked** |
| Equivalent REST re-read + classify | **PASS** — both allowlisted IDs `would_patch` |
| `APPLY` / confirm env | **unset** |
| Firestore writes | **0** |
| Would-patch IDs | `kkD1yLR9UNFsleK4Bg4Z`, `sTN1ewGYYpK8fWg6nU0s` |
| Skipped IDs | **none** |
| Patched IDs | **none** |

Dry-run artifact: `docs/workflow/reviews/legacy-pending-false-pending-repair-dry-run-2026-08-11-rest-equivalent.json`

Optional: owner may re-run the official node command above to produce the script-native JSON timestamp artifact before APPLY (predicates already verified).

---

## Confirmations

| Action | Occurred? |
|--------|-----------|
| Inventory (read-only) | **Yes** |
| Dry-run classification | **Yes** (REST equivalent) |
| APPLY / production mutation | **No** |
| Functions / Rules / App Hosting / Algolia / Studio / DNS | **No** |

---

## Next owner phrase (binding from Plan)

```
APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR
```

Do **not** issue APPLY until ready. APPLY still requires `APPLY=1` and `CONFIRM_PROD_LEGACY_PENDING_REPAIR=1` on the prod-pinned script.
