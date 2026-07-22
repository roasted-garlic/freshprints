# Manual Test Checkpoint: AI Processing designs wipe

**Feature / area:** Studio Test Data Reset — AI Processing selective wipe  
**Why automated tests are insufficient:** Destructive Firestore/Storage wipe against live `fresh-prints-dev`; UI confirm flow.  
**Environment:** Studio `npm run dev` against `fresh-prints-dev`  
**Prerequisites:**

1. Soft-reload Studio so Test Data shows **AI Processing** checkbox + preset.
2. Owner approval, then redeploy:

```bash
firebase deploy --only functions:wipeOperationalTestData --project fresh-prints-dev
```

3. At least one design on AI Processing (any of Processing / Needs Review / Rejected). Ideally leave at least one **ready** Design Library design.

### Steps

1. Open Studio → **Test Data** → click preset **AI Processing**.  
   → **Expected:** Only **AI Processing** is checked (not full Designs / Print Requests).

2. Wipe selected… → type `WIPE TEST DATA` → Wipe now.  
   → **Expected:** Success result shows `AI Processing designs deleted: N` (N ≥ 1 if fixtures existed) and Storage files deleted count; no catalog-ack modal.

3. Open **AI Processing**.  
   → **Expected:** Processing / Needs Review / Rejected lists empty (or only designs created after the wipe).

4. Open **Design Library**.  
   → **Expected:** Ready designs that existed before the wipe are still present.

5. (Optional) Confirm full **Designs** and **AI Processing** remain mutually exclusive in the UI toggles.

### Pass criteria

- [x] AI Processing preset wipes inbox designs across tabs without deleting ready catalog
- [x] Phrase confirm still required; no designs catalog modal for this target alone
- [x] Result summary reports AI Processing delete count

### Result

**PASS** — owner 2026-07-21. Functions redeploy SUCCESS.
