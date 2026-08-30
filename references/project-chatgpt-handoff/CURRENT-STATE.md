# Fresh Prints — Current State Snapshot

**Last updated:** 2026-08-30

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **ACTIVE** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Plan + Formal Review complete — STOP for owner approval** |
| Review | **approved_with_changes** |
| Implementation | **NOT STARTED** |
| Production | **NOT AUTHORIZED** |
| Studio publish | **NOT AUTHORIZED** |
| Portal App Hosting | **NOT AUTHORIZED** |
| Human checkpoint | **no** (awaiting owner ack of Formal Review) |
| Workflow state | `.cursor/workflow/state.md` |

---

## Customer Identity program — COMPLETE on DEV

| Workstream | Status |
|------------|--------|
| WS1 Identity foundations | **DONE** |
| WS2 Transfer Username | **DONE** |
| WS3 Full Account Merge | **DONE** |
| WS4 Customer Activity + Deep Linking | **DONE** (Owner DEV QA **PASS** 2026-08-30) |

Signoff: `docs/workflow/reviews/2026-08-30-customer-account-identity-management-ws4-signoff.md`

**No production promotion** of identity work.

---

## Recently completed on DEV (not production)

### Show Queue — Did Not Print recovery

- Primary: **Move unprinted requests to another show**
- Secondary: **Release only** → **Needs Re-queue** Working triage (rightmost: Active · Stale · Empty · All · Needs Re-queue)
- `requeuedFromAllocationId` lineage; source allocations historical/canceled
- Owner DEV QA **PASS**; signoff 2026-08-30

### Show Queue — DEV fixture / allocation repair

- `DEV-OVERRIDE` / `source: "dev_fixture"` (DEV-only; not Whatnot identity)
- Allocation permission allowlist repair
- Excluded from Whatnot import/sync

### Owner Edit Show (scoped DEV QA enabler)

- Owner-only metadata edit on eligible Whatnot + DEV fixture shows (title, schedule, notes, Whatnot URL on Whatnot shows)
- DEV fixture external identity immutable

### Print Request Standard Size presets

- Settings + modal (v1 defaults) on DEV — signoff 2026-08-29

---

## Current sizing policy (IMPLEMENTED today)

| Setting | Shipped value | Notes |
|---------|---------------|-------|
| Print Request initial default width | **10″** | `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` |
| Automated import upscale target | **12″** | `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` |
| Approved max width envelope | **15″** | ADR-FP-080 |
| Max upscale factor | **6×** | Single import pass |
| Gang sheet default width | **23″** | Two **11″** prints fit side-by-side at 0.25″ margins + 0.5″ gutter |

---

## Approved / planned NEXT values (NOT shipped)

| Setting | Planned value | Goal |
|---------|---------------|------|
| Print Request initial default | **11″** | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Automated upscale target | **15″** | same (forward-only for new imports) |
| Legacy art enhance | Staff-triggered from Print Request | same (Studio V1 recommended) |

---

## Roadmap sequencing (owner)

1. Customer Identity WS1–WS4 — **DONE (DEV)**
2. Show Queue recovery / DEV fixture — **DONE (DEV)**
3. **11″ default + 15″ upscale + legacy enhance** — **NEXT (planning complete)**
4. Smart Profiling completion / tag retirement — **AFTER sizing goal**
5. Coordinated production promotion — **later**

**Do not start Smart Profiling** until sizing/upscale goal is complete.

---

## Smart Profiling (truthful state)

- Smart Profiles exist (`smart-profile-v1`); Algolia Smart Filters on DEV
- Shadow / reprocess control plane on DEV (Slice 4–6 work)
- **Autonomous live approval OFF**
- Legacy tag retirement **not complete**

---

## Live production (unchanged by recent DEV work)

| Item | Value |
|------|-------|
| Git `production` | See `docs/project/ROADMAP.md` / last promote signoff |
| Canonical Portal | `https://myprintrequest.com` |
| Published Studio | **1.0.9** (last documented promote) |

Recent DEV goals (identity, show queue, standard sizes, sizing plan) are **not** on production.

---

## Testing note (preserve)

Show Queue scoped Rules suites passed where run. Full `npm run test:rules` is **not** claimed globally passing due to unrelated Firestore Rules expression-budget failures in other suites. Do not rewrite history without a verified full-suite pass.

---

## Next workflow step

Owner acknowledges Formal Review for sizing/upscale goal → begin **Implement** phase (separate session). **No implementation in planning session.**
