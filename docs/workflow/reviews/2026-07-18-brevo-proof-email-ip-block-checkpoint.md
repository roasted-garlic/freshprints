# Human Checkpoint - Brevo proof-ready email (IP / deliverability)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Workflow | managed-phase / investigation / Brevo first-proof email miss |
| Reason | Owner identified Brevo/provider IP blocking; app enqueue path is fine |
| Status | **resolved - PASS** |
| Resolution | Owner **PASS** 2026-07-18 (IP/blocklist deliverability). Signoff: `docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-signoff.md` |

---

## What We Needed From You

In the Brevo dashboard, clear or authorize whatever was blocking Cloud Functions egress so proof-ready sends stop failing with provider rejection.

**Owner result:** **PASS** (2026-07-18).

---

## Log confirmation (app side - not a first-proof skip)

`staffAddAssistedCreationProof` **does** create `emailDeliveryJobs` on first proof. Recent `fresh-prints-dev` logs (pre-fix):

| Time (UTC) | Request | Proof | Outcome |
|------------|---------|-------|---------|
| 02:53:47 | `CJ5H20V4.` (first proof on request) | `785b3f6c.` | Job enqueued (Brevo); `onEmailDeliveryJobCreated` → **`provider_rejected`** |
| 03:04:39 | same request (follow-up proof) | `d114ad19.` | Job enqueued; **`Email delivery job sent.`** (Brevo) |
| 15:13:29 | `QSKLBJGKe1.` (first proof, new request) | `58f68752.` | Job enqueued (Brevo); **`provider_rejected`** |

In-app notifications (Portal + web push) succeeded on those same first proofs. Failure was **downstream at Brevo**, not a missing enqueue or "subsequent proof only" branch.

No app code deploy for this pivot.

---

## Closed

Owner Brevo IP/blocklist work + retest → **PASS**. Checkpoint cleared; workflow idle.
