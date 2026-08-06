# Amendment 8 Plan — Independent Formal Review (Scalable Catalog Read-Architecture Addendum)

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Reviewer | Independent Formal Review + planning follow-up re-check |
| Plan under review | `docs/workflow/plans/2026-08-05-post-launch-catalog-and-processing-stability-amendment-8-plan.md` |
| Plan title | Snapshot Removal + Scalable Portal Catalog Read Architecture |
| HEAD at review | `76dc046178be73c442dfe97b13b990b42e512e29` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Scope | Formal Review of updated Plan only. **No implementation.** |
| Prior independent verdict | **APPROVED WITH REQUIRED CHANGES** ([Draft Formal Review verdict](992919e6-74ab-45e3-a6af-169d8bab9414)) |
| Verdict after Required Changes applied | **APPROVED** (Phase **1A** Implement-ready after separate authorization; Phase **1B** still blocked on §16 #1) |

---

## 1. Method

Independent Formal Review challenged the Plan against HEAD source, Git, and package manifests (see agent transcript). Planning then applied the six Required Changes **in place** to the Plan. This document records that challenge, the applied fixes, and a re-check that the gaps are closed.

Checks performed (read-only against HEAD `76dc046` + post-edit Plan):

- Full Plan §§0–18 after Hybrid addendum + Required Changes.
- `git rev-parse HEAD` → `76dc046…`; branch match.
- AI monotonic repair signoff + ancestry (`30e1e28` ⊂ HEAD; signoff `76dc046`).
- No Algolia / Typesense / Meilisearch deps.
- Portal constants/generated path/image path/Studio page cache as previously confirmed.
- `git ls-files references/project-chatgpt-handoff/*` → **18 tracked files** including `CURRENT-STATE.md` (Plan header was wrong; now fixed).
- Mechanical §11 Action recount: **15 / 35 / 23 / 2 / 0 = 75**.

---

## 2. Binding-fact spot-check

| Binding fact | Result |
|---|---|
| Branch + HEAD `76dc046` | **Confirm** |
| AI monotonic repair signed off PASS | **Confirm** |
| No Algolia/Typesense deps | **Confirm** |
| Portal page sizes 40 / 80 | **Confirm** |
| Generated path: Storage URL + JSON, inflight, 30s TTL, 16MB | **Confirm** |
| `allowsBoundedCatalogFirestoreFallback` unfiltered only | **Confirm** |
| Home: `listDiscoverDesigns` only; pool unwired | **Confirm** |
| Images: lazy/eager target; Storage URL; no Firestore | **Confirm** |
| Studio page cache 15s / page 100 | **Confirm** |
| 2000 hydration rejected as permanent search | **Confirm** |
| Handoff package present | **Confirm** (Plan header corrected) |

---

## 3. Independent challenges (pre-fix)

1. Handoff absence claim was **false**.
2. ADR-FP-120 supersession under-specified.
3. Stage 6 “client cutover” ambiguous vs Stages 1–3.
4. Matrix DELETE timing vs Hybrid search dependency needed an explicit gate.
5. Partial Implement authority only a footnote — elevate **1A / 1B**.
6. Search-key security incomplete for an Algolia-recommending Plan.
7. Firestore-only scalable rejection accepted — do not reopen hydration.
8. Future `functions/src/catalogSearch/**` as Implement-time `[NEEDS REPO CHECK]` accepted.

---

## 4. Required Changes — applied status

| # | Required change | Plan location | Status |
|---|---|---|---|
| 1 | Correct handoff claim (present; do not update this pass) | Header | **Applied** |
| 2 | ADR-FP-120 supersession + ARCHITECTURE / BACKEND / SECURITY / DATA_MODEL | §1.1 + gate table | **Applied** |
| 3 | Stage 6 = **production** cutover only | §14 Stage 6 | **Applied** |
| 4 | Explicit Implement Phase **1A / 1B** | §14 Stage 1; §16 | **Applied** |
| 5 | Tighten search-key security | §8.4 recommendation + §8.5 | **Applied** |
| 6 | Align §10 publisher/DELETE with §8Z / Phase 1B gate | §10.1, §8Z, matrix Portal/publisher rows, §12 timing | **Applied** |

---

## 5. Matrix recount

| Action | Count |
|---|---|
| KEEP CURRENT | **15** |
| DELETE SNAPSHOT-ONLY | **35** |
| MANUAL EDIT CURRENT HEAD | **23** |
| REPLACE WITH CURRENT FIRESTORE SERVICE | **2** |
| NEEDS REPO CHECK | **0** |
| **TOTAL** | **75** |

Action totals unchanged by Required Changes (evidence columns only). **Pass.**

---

## 6. Architecture / security / teardown (post-fix)

- **Hybrid Option 1** remains feasible and correctly preferred over hydration and Firestore-only “scalable” full-text/facets.
- **1A** may proceed without a provider; **1B** waits on §16 #1; generated Portal readers DELETE only in 1B.
- **Publisher source DELETE / un-export** gated after Phase 1B (§10.1) — Stage 4 still owns live Function retirement.
- **Search security:** write keys never in client; search-only keys + provider allowlists; index ≠ authz; env/secret docs required at Implement.
- **Outage:** browse continues; search fails closed explicitly — **Pass**.
- **AI no-touch:** KEEP CURRENT / signed off — **Pass**.
- **Stage 6:** production indices/secrets/backfill/cutover/observation — not a second Stage-1 source cutover — **Pass**.

---

## 7. Owner decisions

**Resolved — do not reopen:** AI PASS at `76dc046`; reject 2,000 hydration; snapshot removal still required (sequenced); Firestore authoritative; Storage for images; Stage 2 localhost; AI KEEP CURRENT.

**Remaining — valid:** provider (#1) blocks **1B** only; account/billing/indices/secrets/outage UX confirm; Stage 4–6 approvals.

---

## 8. Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | **pass** | Explicit 1A / 1B |
| Architecture alignment | **pass** | Hybrid + ADR supersession named |
| Security impact addressed | **pass** | Key restrictions + docs obligations |
| Data model impact addressed | **pass** | Derived search records via DATA_MODEL if documented |
| Backend impact addressed | **pass** | BACKEND.md + sync gate |
| Test strategy adequate | **pass** | §15 |
| Human checkpoints identified | **pass** | §16 |
| Documentation plan | **pass** | §1.1 |
| No silent scope expansion | **pass** | AI untouched; hydration rejected |

---

## 9. Verdict

**APPROVED**

Independent Formal Review initially returned **APPROVED WITH REQUIRED CHANGES**. Those six Plan edits are now applied in place. Formal Review is cleared for **Phase 1A Implement authorization** as a separate subsequent step.

**Phase 1B / managed-search coding / Portal generated-asset deletion** remain blocked on owner provider selection (§16 #1).

This Formal Review does **not** itself open Implement, create provider accounts, mutate Git, merge PR #40, or deploy.

---

## 10. Safety (this review pass)

Edited **only** this Formal Review file and the companion Plan (Required Changes). No application source/tests; no provider/Firebase/Git/production/merge/deploy; PR #40 remains open/unmerged. No duplicate Amendment 8 documents created. HEAD remains `76dc046178be73c442dfe97b13b990b42e512e29`.
