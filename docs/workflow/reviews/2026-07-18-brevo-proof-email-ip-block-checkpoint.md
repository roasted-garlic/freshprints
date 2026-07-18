# Human Checkpoint — Brevo proof-ready email (IP / deliverability)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Workflow | managed-phase / investigation / Brevo first-proof email miss |
| Reason | Owner identified Brevo/provider IP blocking; app enqueue path is fine |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

In the Brevo dashboard, clear or authorize whatever is blocking Cloud Functions egress so proof-ready sends stop failing with provider rejection.

---

## Log confirmation (app side — not a first-proof skip)

`staffAddAssistedCreationProof` **does** create `emailDeliveryJobs` on first proof. Recent `fresh-prints-dev` logs:

| Time (UTC) | Request | Proof | Outcome |
|------------|---------|-------|---------|
| 02:53:47 | `CJ5H20V4…` (first proof on request) | `785b3f6c…` | Job enqueued (Brevo); `onEmailDeliveryJobCreated` → **`provider_rejected`** |
| 03:04:39 | same request (follow-up proof) | `d114ad19…` | Job enqueued; **`Email delivery job sent.`** (Brevo) |
| 15:13:29 | `QSKLBJGKe1…` (first proof, new request) | `58f68752…` | Job enqueued (Brevo); **`provider_rejected`** |

In-app notifications (Portal + web push) succeeded on those same first proofs. Failure is **downstream at Brevo**, not a missing enqueue or “subsequent proof only” branch.

No app code deploy for this pivot.

---

## Owner steps in Brevo (no secrets)

1. **Transactional logs** — find failed sends around the times above; note status (blocked / error / unauthorized IP / etc.).
2. **Sending IP / security** — if Brevo requires IP allowlisting, authorize Firebase Functions / Cloud Run egress for `us-central1` (or disable IP restriction for transactional API if that matches your security posture).
3. **Sender / domain** — confirm `team@funkyfreshprints.com` (or current proof-from address) and domain auth still valid for transactional send.
4. **Retest** — new Assisted request → staff first proof → expect inbox + History “Proof-ready email sent”; job doc `status: sent`, `provider: brevo`.

Reply when Brevo side is fixed (or with what the transactional log showed).

---

## Agent Actions While Paused

**Allowed:** Read docs; answer questions; await owner Brevo feedback  
**Forbidden:** Speculative first-proof code fixes; Functions deploy for this issue; production actions; secrets in chat
