# Review — Batch Import Size Limits

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/batch-import-size-limits-plan.md`  
**Status:** **approved**

---

## Confirmed Limits

- PNG: 150 MB
- ZIP: 1 GB  
- Extracted: 10 GB (explicit; higher than derived 2.5 GB — documented in ADR-FP-010)

---

## Verdict

**approved** — proceed to implement/test/signoff. Production `storage.rules` deploy remains a separate human checkpoint.
