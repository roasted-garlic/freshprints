# Manual QA: Portal notifications — batch mark-read

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Feature | portal-notifications-batch-mark-read |
| Environment | local Portal + `fresh-prints-dev` |
| Plan | docs/workflow/plans/2026-07-17-portal-notifications-batch-mark-read-plan.md |

---

## Product rule (what we do)

When a customer opens an assisted Alerts deep-link (messages or proofs tab) and the destination loads, Portal marks **all unread** `customerNotifications` with the same `requestId` and same `kind` as read — not only the clicked id.

- Messages alerts clear other unread message alerts for that request.
- Proof alerts clear other unread proof alerts for that request.
- A message alert does **not** clear proof alerts (and vice versa).
- **No** per-item **Read** link on Portal (Studio Messages inbox keeps its own Read control).
- **Mark all read** in the Alerts footer clears every loaded unread (cross-request edge cases).
- Alerts close via header **X** (not a footer Close link); footer labels are short (**Mark all read**, **History**).
- History stays history; items move unread → read.

---

## Prerequisites

- Portal running locally against `fresh-prints-dev`
- Customer account with at least one assisted request
- Staff can send messages / add proofs from Studio

---

## Steps

### A — Same request, same kind (messages)

1. From Studio, send **two** staff messages on the **same** assisted request (or ensure two unread `assisted_staff_message` alerts exist for that request).
2. In Portal, open **Alerts** → confirm **two** unread “New message” items.
3. Click **one** of them → **Expected:** navigates to Custom Designs assisted status, **messages** tab; badge/unread count drops by **2** (both cleared); Alerts reopen shows neither sibling still unread.
4. Open **History** → **Expected:** both cleared alerts appear in history.

### B — Kind isolation (messages vs proofs)

1. Ensure the same request has at least one unread message alert **and** one unread proof alert.
2. Click the **message** alert → **Expected:** message unread(s) for that request clear; proof unread remains.
3. Click the **proof** alert → **Expected:** proof unread(s) for that request clear.

### C — Mark all read

1. Create unread alerts for **two different** requests (or leave leftovers).
2. Open **Alerts** → click **Mark all read** → **Expected:** panel closes; badge goes to 0; history lists the cleared items; no per-row Read needed.

### D — Regression

1. Click a history (already read) item → **Expected:** navigates; does not error; badge unchanged.
2. Alerts dropdown still unread-only; history still read-only.

### E — Alerts dropdown chrome (residual UX 2026-07-17)

1. Open **Alerts** → **Expected:** header has title + **X** top-right (no footer Close link).
2. Footer actions read **Mark all read** | **History** (short labels, single even row).
3. If push not enabled, CTA reads **Enable alerts** (not “Enable browser alerts”).

---

## Pass criteria

- [x] A: clicking one message alert clears all unread message alerts for that request
- [x] B: message vs proof kinds do not clear each other
- [x] C: Mark all read clears remaining unread
- [x] D: history + unread-only dropdown still correct
- [x] E: X close in header; short footer labels; no footer Close
- [x] No Portal per-item Read link required for this flow

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** — owner reply 2026-07-17: “Now, PASS this.” Covers batch mark-read (A–D), Alerts chrome (E), and same-session residual Messages bubble flip / moderate width. Does **not** close web-push A5/B3.

---

## Also still open (separate)

**portal-notifications-web-push** A5 / B3 OS toast QA — do not treat this residual as closing web-push.
