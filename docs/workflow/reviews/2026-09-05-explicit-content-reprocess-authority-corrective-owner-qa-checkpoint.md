# Owner QA Checkpoint — ADR-FP-173 Replacement QA C

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Status | **DEV DEPLOYED — REPLACEMENT QA C PENDING** |
| Gate | **shadow / live false** — leave Autonomous OFF |
| Fixture | **`CqkwDf1BOll43yojGd5Y`** |
| Studio | **local DEV** (lock UI + helper copy) |

## Prior QA (accepted)

| QA | Result |
|---|---|
| A | **PASS WITH NOTES** |
| B | **PASS BY AUTOMATED / CONTRACT PROOF** |

---

## Agent pre-check (fixture before C1)

| Field | Current value |
|---|---|
| `isExplicitContent` | `false` |
| `censoredTerms` | absent/cleared |
| `explicitContentSource` | `staff` |
| `explicitContentAutomationLocked` | absent (**unlocked**) |
| lifecycle | `imported` / `needs_review` |

If Studio still shows Explicit ON or lock ON, set them to OFF and save before reprocess.

---

## Manual Test Checkpoint

### QA C1 — UNLOCKED REPROCESS RE-APPLY

**Feature:** staff provenance alone must not block positive Explicit re-apply  
**Environment:** `fresh-prints-dev` + local Studio  
**Prerequisites:** Deploy complete; Autonomous OFF; lock OFF

#### Steps
1. Open `CqkwDf1BOll43yojGd5Y` → Explicit **OFF**; remove `damn`; **Lock Explicit setting OFF** → Save  
2. Confirm saved: Explicit OFF, no damn, source staff, lock not true  
3. Reprocess (AI re-run) while Autonomous OFF  
4. After enrichment: Explicit **ON**; `damn` restored; source **automation**; lock still OFF; Needs Review; not Ready; no `system:catalog-autonomy`

#### Pass criteria
- [ ] Explicit re-applied ON  
- [ ] `damn` restored  
- [ ] source automation  
- [ ] lock remained OFF  
- [ ] no Ready / no system approval  

### Please reply with
- `QA C1: PASS`
- `QA C1: FAIL: [description]`
- `QA C1: PASS WITH NOTES: [notes]`

**Do not start QA C2 until C1 PASS.**

---

### QA C2 — LOCKED STAFF OVERRIDE

**Only after QA C1 PASS.**

#### Steps
1. Explicit **OFF**; remove `damn`; **Lock Explicit setting ON** → Save  
2. Confirm: source staff, lock **true**, Explicit OFF, no damn  
3. Reprocess (Autonomous OFF)  
4. Expected: Explicit stays OFF; `damn` does **not** return to root terms; lock stays true; diagnostics may show detected + suppressed due to lock; Needs Review; not Ready  

#### Pass criteria
- [ ] staff Explicit choice preserved  
- [ ] damn absent from root terms  
- [ ] lock remains true  
- [ ] no Ready / no system approval  

### Please reply with
- `QA C2: PASS`
- `QA C2: FAIL: [description]`
- `QA C2: PASS WITH NOTES: [notes]`

---

## Cleanup / Signoff / WS6

Deferred until C1 + C2 complete. Fixtures retained (`Cqkw…`, `UB7…`). Forensic `03cb…` untouched. No Signoff / WS6 this pass.
