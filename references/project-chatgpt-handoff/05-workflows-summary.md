# Workflows Summary

## Design lifecycle (catalog)

```
Staff imports PNG (ZIP or folder)
    ↓
Validate (type, DPI, dimensions, print size)
    ↓
Upload original + generate thumbnail/preview
    ↓
Create Firestore design (status: imported)
    ↓
Auto-enqueue AI enrichment (Cloud Function)
    ↓
AI Review — Processing tab (awaiting/running AI)
    ↓
AI Review — Needs Review tab (staff review)
    ↓
Staff approves → status: ready → Design Library
    OR
Staff rejects → status: rejected → Rejected tab
```

## Design Library workflow

```
Open /designs (default landing)
    ↓
Browse approved catalog (status: ready)
    ↓
Search / filter by category, tags, archived
    ↓
View details → Edit metadata → Archive/restore
```

Design Library **never** shows imported or rejected designs by default.

In Print Request selection mode, `/designs?mode=request-selection&requestId=...` remains an approved-catalog browser but adds selected-card state, quantity controls, and save/back actions for the active request.

## AI Review workspace workflow

```
Select design from queue (oldest first)
    ↓
Review preview + AI suggestions + pipeline status
    ↓
Edit title, description, category, tags if needed
    ↓
Approve & Next → design moves to Library, advance queue
Reject & Next → design moves to Rejected tab
Skip → next item, no status change
Re-run AI → re-enqueue, stay on Processing tab
```

## Import workflow (batch)

```
Select ZIP or folder
    ↓
Discover PNGs (nested ZIP support)
    ↓
Validate each file
    ↓
Process derivatives (main process + sharp)
    ↓
Upload to Storage + create/update Firestore
    ↓
Enqueue AI for each design
    ↓
Show completion summary with link to AI Review
```

## Team user management

```
Users page → search/filter
    ↓
Add user modal → createTeamUser callable → invitation email
    ↓
Edit user modal → updateTeamUser callable → sync Auth disabled + Firestore isActive
```

Customer provisioning note:

Owners/admins can create and edit customer records from `/users`. These records support registered customer Print Requests without creating Firebase Auth accounts, `users/{uid}` documents, or Studio access.

## Print Request workflow (Phase 6 — PASS)

```
Open /print-requests
    ↓
Create internal or customer print request
    ↓
Open Add designs → Design Library request-selection mode
    ↓
Select approved catalog designs and quantities
    ↓
Save to request
    ↓
Edit/remove request items as needed
```

Rules:

- Only approved catalog designs (`status: ready`) may be added.
- Request item status and notes live on `printRequestItems`.
- Design records remain catalog records and keep catalog lifecycle status.
- No checkout, payment, shipping, Portal, Whatnot, or Phase 7 Print Runs in Phase 6.

## Future workflows (not implemented)

**Print Run (Phase 7):** Group requests into show/batch → export originals for Pensacola gang sheets.

**Custom Request (Phase 9):** Q&A intake → Etsy referral or in-house custom art path.

## Workflow rules

- Workflows must be **predictable**, **recoverable**, and **observable**
- Failed imports should resume from last successful step where possible
- Status must always indicate current state and next action
- Never auto-publish to catalog without staff approval
