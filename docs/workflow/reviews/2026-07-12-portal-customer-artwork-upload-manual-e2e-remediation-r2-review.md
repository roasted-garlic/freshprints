# Review: Portal Customer Artwork Upload — Manual E2E Remediation Round 2

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-r2-plan.md` |
| Round | 1 |
| Verdict | **approved** |

---

## Checks

| Criterion | Result |
|-----------|--------|
| Root causes documented before fix | Pass (callable for #1; lastResult guards #2; delivery collection #3; stage/progress #4; silent refresh #5–6) |
| Security: prefer callable over widening client upload-item create | Pass |
| Wipe stay parked; no prod allowlist | Pass |
| Limits / transparency / AI prompt unchanged | Pass |
| No new npm dependency | Pass |
| Test + deploy strategy to fresh-prints-dev | Pass |
| Manual retest hard gate before G/parent signoff | Pass |

---

## Binding notes for implement

1. **Duplicate:** Implement `duplicatePortalPrintRequestItem` callable; Portal upload path must use it. Catalog path may remain client `addPrintRequestItem` if already working.  
2. **Wipe:** Guard `lastResult` fields before any `.join` / `Object.entries` / `.includes`.  
3. **Sound:** Persist delivery separately from Done ack; fix hydrate race.  
4. **Upload:** Keep finalize concurrency ≤ 3; add real Storage progress where available; map backend statuses to required stage labels.  
5. **Studio intake:** Never set full-page `isLoading` for card mutations; keyed pending labels required.

---

## Verdict

**approved** — implement all six issues within this plan. Standing `fresh-prints-dev` deploy authorization applies for Functions/rules as needed. Do not sign off G/parent until manual retest PASS.
