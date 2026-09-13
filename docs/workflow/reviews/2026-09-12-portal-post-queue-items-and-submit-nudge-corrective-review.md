# Formal Review — Portal post-queue empty items + submit nudge toast

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-plan.md` |
| Goal | `portal-post-queue-items-and-submit-nudge-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Verdict | **`approved_with_changes`** |

---

## Summary

The plan correctly separates a real post-queue empty-items reliability bug from a product toast nudge, and keeps scope Portal-client-only. Accepting a post-queue `reload` trades Wave C’s zero-read preference for customer-visible correctness — appropriate given the empty queued detail screenshot. Replacing Undo with a longer Review CTA matches the owner’s “you’re not done” goal without adding banners/modals.

---

## Required changes before Implement

1. **Post-queue reload must be explicit and ordered**
   Call `clearPortalPrintRequestReadCache()` then `await reload({ silent: true })` **after** schedule/allocation hydrate (or in the same `Promise.all` if safe), so Remove & Edit eligibility and item list both settle. Do not leave “reload only if empty” as the sole path — empty detection can race; always rehydrate after successful queue on this page.

2. **Preserve Wave C documentation honesty**
   Update any contract/comment that claims “0 client reads after queue” to state the new exception: detail page performs a silent reload for item truth.

3. **Subscribe merge must not resurrect deleted rows indefinitely**
   When keeping non-optimistic locals across empty snapshots, bound the behavior (e.g. only while `isLoading`/first empty frame, or merge by id with server-authoritative removals once a non-empty snapshot arrives). Document the rule in the implementation review so clear-request / remove cannot soft-lock ghost items.

4. **Toast duration API**
   Add optional `durationMs` on toast options; default **4000** unchanged for all other toasts. Submit-nudge uses **15000** unless owner overrides at acceptance.

5. **Assisted Creation parity**
   If Assisted Add-to-Request success still shows the Undo-style “Added to your Current Request” toast via the same helper, switch it in this corrective. If it uses a separate path, either wire the same announce helper or list that path as a one-line follow-up — do not leave catalog adds nudged and Assisted adds on Undo without an explicit note.

---

## Accept as written

- No backend / Rules / projection schema change for this child.
- No Signoff of sentinel from this work.
- No production / M0 / freeze.

---

## Residual risks (accepted)

- Extra post-queue reads vs Wave C.
- Loss of Undo on add-announce (owner-requested).
- Residual projection lag on cold refresh remains a separate concern if `portalPrintRequestItems` are missing; this corrective fixes the stuck empty local state after queue.

---

## Next checkpoint

`OWNER ACCEPT PORTAL POST-QUEUE ITEMS + SUBMIT NUDGE CORRECTIVE + AUTHORIZE IMPLEMENT`
