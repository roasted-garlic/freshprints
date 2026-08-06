# Manual Test Checkpoint — Amendment 9 P0 AI Review local reconciliation

**Feature / area:** Studio AI Review approve/reject/archive without full list/count reload  
**Why automated tests are insufficient:** Electron + live Firestore + Firebase Debug instrumentation  
**Environment:** `fresh-prints-dev`, Studio on branch `fix/post-launch-catalog-and-processing-stability`  
**Prerequisites:** Staff account; Firebase Debug enabled; optional small Processing batch

## Steps

1. Open `/ai-review` Needs Review with a few designs → **Expected:** list + tab counts load once.
2. Approve design A → **Expected:** A disappears immediately; B selected once; Needs Review count −1; Debug shows **no** new `listDesignsPage` / **no** three `countDesigns` for that action.
3. Reject next → **Expected:** leaves Needs Review; Rejected +1; Needs Review −1; no full reload.
4. On Rejected, archive one → **Expected:** leaves list; Rejected −1; no full reload.
5. Force a failure if safe (e.g. offline briefly during approve) → **Expected:** error shown; **one** list reload + count refresh; no loop; no false local ready.
6. Reopen `/ai-review` → **Expected:** authoritative server list/counts.
7. Run a small Processing batch → **Expected:** Processing **3 → 2 → 1 → 0** still works; counts update via existing Processing path.
8. (Preferred) 45-design Needs Review approve-through with Debug → **Expected:** post-approval list docs **0**; per-approval count ops **0**; no triangular pattern; no listeners; no reload loop.

### Pass criteria

- [ ] Successful actions do not full-reload the remaining page
- [ ] Successful actions do not refresh all three counts
- [ ] Selection advances A→B→C→none correctly
- [ ] Counts look correct locally
- [ ] Failure recovers once without a false ready state
- [ ] Processing monotonic behavior intact
- [ ] Debug budgets met on successful batch (if run)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Do not Signoff until owner replies.**
