# Manual QA: Customer cancel reason (assisted creation)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | Local Portal + Studio against `fresh-prints-dev` |
| Function deploy | `cancelAssistedCreationRequest` → `fresh-prints-dev` (required) |
| Status | **PASS** |
| Resolution | Owner directed **PASS all** (2026-07-17) for remaining parked owner-QA after proof-download closeout |

## Prerequisites

- Portal hard-refresh after pull
- Open assisted request in a cancellable status (`submitted` / `in_progress` / `proof_ready` / `revision_requested`)
- Studio Custom Designs → Assisted open for same request

## Steps

1. Portal → Cancel → leave reason empty → confirm stays disabled.  
   **Expected:** Cannot cancel.

2. Enter a short reason → **Yes, cancel request**.  
   **Expected:** Request becomes cancelled; no error.

3. Studio → same request → status Cancelled.  
   **Expected:** Under status header: **Customer cancel reason:** &lt;your text&gt;.

4. Staff cancel on another open request (? → Cancel with staff reason).  
   **Expected:** Still works; no "Customer cancel reason" unless customer cancelled.

5. (Optional) Past Requests path: cancel an open request from history modal with reason.  
   **Expected:** Same as steps 1-3.

## Pass criteria

- [x] Empty reason blocked
- [x] Reason required cancel succeeds
- [x] Studio shows customer cancel reason
- [x] Staff cancel unchanged

## Please reply with

- `PASS` - all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Your result:** **PASS** (owner **PASS all**, 2026-07-17)

