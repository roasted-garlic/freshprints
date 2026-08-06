# Amendment 8 Phase 1A — Assisted catalog-share artwork background — Independent Implementation Review

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Base HEAD | `4ed41bc` |
| Scope | Assisted catalog-share artwork-background correction only |
| First verdict | **CHANGES REQUIRED** — Portal proofs-list thumbs lacked panel-scoped legacy live-resolve |
| Final verdict | **APPROVED** |

## Method

Reviewed the working-tree diff against the owner note and Phase 1A constraints. Traced Studio picker → suggest callable → suggestion/proof snapshots → Studio/Portal surfaces → legacy one-shot resolve. Confirmed AI Processing, snapshot publishers, Rules, and Phase 1B search paths untouched.

## Checklist (final)

| # | Check | Result |
|---|---|---|
| 1 | Mat is CSS presentation; PNG not baked | PASS |
| 2 | Authoritative design-doc hex; no client override | PASS |
| 3 | Optional suggestion + proof snapshot fields | PASS |
| 4 | Legacy one-shot get; no per-card listener / read storm | PASS (panel-scoped Portal proofs list included) |
| 5 | Invalid/missing → default mat; no workflow failure | PASS |
| 6 | No Phase 1B / managed-search work | PASS |
| 7 | No snapshot publisher deletion | PASS |
| 8 | No AI Processing modification | PASS |
| 9 | No Rules change | PASS |
| 10 | No lifecycle/status/permission change | PASS |
| 11 | Catalog preview paths unchanged | PASS |
| 12 | Behavioral shared mapping tests | PASS (wiring tests remain source-contract supplements) |

## Non-blocking residuals

- New suggest snapshots require the updated Functions runtime against the Firebase project under test; live-resolve covers display for legacy / pre-deploy shares.
- Studio may issue duplicate one-shot `getDesignById` (overview + proof settle) for the same legacy design — bounded, not a listener loop.
- Portal production build was not re-proven in this pass while `dev:portal` held `.next`; Portal typecheck passed.

## Safety

No Firebase deploy, provider account, production action, PR merge, or Signoff approval.
