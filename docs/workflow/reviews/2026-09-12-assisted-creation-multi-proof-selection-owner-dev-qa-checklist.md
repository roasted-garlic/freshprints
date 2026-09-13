# Owner DEV QA Checklist — Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `assisted-creation-multi-proof-selection` |
| Environment | Studio + Portal localhost → `fresh-prints-dev` |
| Status | **READY — awaiting Owner DEV QA** |
| Checkpoint | `OWNER DEV QA: assisted-creation-multi-proof-selection` |

## Prerequisites

1. Studio signed in as owner/admin against DEV.
2. Portal customer with an Assisted request that can reach proof send / respond / final artwork.
3. Customer opted in to proof emails (or use a known opted-in account) for email checks.

## Manual Test Checkpoint

### Steps

1. Send **one** proof as today → customer can approve/request revision without forced radio UX.
2. Send **2–3** proof images in one round; reorder before send → Portal carousel opens on Option A (Studio top order) with arrows/dots and a clear multi-option indicator.
3. Customer selects exactly one option → **Approve selected** works → `final_source_needed`.
4. Separate run: select option → **Request changes** with note → `revision_requested`; next send is a new round; prior round remains visible/read-only in history.
5. History shows selected option/decision; prior rounds immutable.
6. Upload final artwork → customer gets **final-artwork-ready** email + in-app Alert.
7. Add to Request uses final artwork; existing progress modal still works; remove/re-add stays idempotent.
8. Confirm only **one** proof-ready email/notification per multi-option round.
9. Helper remains read-only for proof send.
10. Induce upload failure before attach (e.g. cancel mid-upload / invalid file) → no partial visible Firestore round.

### Pass criteria

- [ ] Single-proof UX unchanged in spirit
- [ ] Multi-option send + reorder + Option A/B/C
- [ ] Select / Approve / Request Changes
- [ ] New round after revision; history correct
- [ ] Final artwork upload + email + Alert
- [ ] Add-to-Request final-source + progress modal + re-add
- [ ] One proof-ready notice per round
- [ ] Helper read-only; no partial round on upload failure

### Please reply with exactly one of

- `OWNER DEV QA: assisted-creation-multi-proof-selection - PASS`
- `OWNER DEV QA: assisted-creation-multi-proof-selection - FAIL: [description]`
- `OWNER DEV QA: assisted-creation-multi-proof-selection - PASS WITH NOTES: [notes]`

Do **not** invent Signoff until that explicit reply.
