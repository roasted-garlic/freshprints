# Manual QA: Brevo email + parallel UX tweaks

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | `fresh-prints-dev` / local Studio + Portal |
| Related | Brevo implement + UX A/B |

---

## Part 0 — Brevo secret (required before live email)

**Do not paste the key into chat.**

1. Create a Brevo **product** API key (HTTP transactional) — not Cursor MCP `BREVO_MCP_TOKEN`.
2. Verify sender/domain in Brevo for `Fresh Prints <team@funkyfreshprints.com>` (or your from params).
3. **Replace** the placeholder Secret Manager value (deploy used a non-working placeholder):

```bash
firebase functions:secrets:set BREVO_API_KEY --project fresh-prints-dev
```

4. Redeploy email Functions once after setting the real key (include **staffAddAssistedCreationProof** —
   it snapshots the provider onto each job; a stale build silently falls back to Resend):

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:onEmailDeliveryJobCreated,functions:updateEmailProviderSettings --project fresh-prints-dev
```

5. Full steps: `docs/workflow/setup/brevo-email-setup.md`

Reply: `BREVO SECRET SET` (no value) when done. Do **not** paste the key.

---

## Part A — Portal: Request revisions above Approve

**Feature:** Assisted proof response expandable blocks  
**Why manual:** Visual order only

### Steps

1. Open a Portal request in `proof_ready` with a proof to respond to.
2. Under **Respond to proof**, confirm block order:
   - First: **Request revisions**
   - Second: **Approve**
3. Expand each; confirm Approve still has rating + Approve & send; Revisions still requires a note.

### Pass criteria

- [ ] Request revisions appears above Approve
- [ ] Both flows still work

### Residual — Sending feedback (2026-07-17)

While **Send revision notes** is in flight:

- [ ] Button label becomes **Sending…** and stays disabled (no double-submit)
- [ ] Textarea is disabled; Approve / rating controls are also disabled
- [ ] Subtle line: “Sending your revision notes…”
- [ ] On success: loading clears; status updates as before
- [ ] On error: loading clears; error message still shows

Optional: Approve shows **Approving…** + “Sending your approval…” the same way.

Reply: `UX A PASS` / `UX A FAIL: …`

---

## Part B — Studio: Taller proof note

**Feature:** Proof upload “Proof note (optional)” when submitting a proof  
**Why manual:** Visual height

### Steps

1. Studio → Custom Designs → Assisted → open request in `in_progress`.
2. Proofs tab → Choose proof image.
3. Confirm **Proof note (optional)** is a multi-line textarea (~5 rows / taller than a single-line input).
4. Optional: type a multi-line note and Submit to customer (dev only).

### Pass criteria

- [ ] Textarea is visibly taller / multi-line
- [ ] Submit still works

Reply: `UX B PASS` / `UX B FAIL: …`

---

## Part C — Brevo proof-ready smoke

**Prerequisites:** Part 0 complete; Functions on new build deployed to `fresh-prints-dev`

### Steps

1. Studio (owner) → Settings → Email Providers → set **Proof-ready emails** to **Brevo** → Save.
2. Ensure test customer is not opted out of proof emails.
3. Attach/submit a proof on an Assisted request.
4. Expect: customer inbox gets proof-ready mail; request History shows `Proof-ready email sent`.
5. (Optional) Switch proof provider back to Resend; submit another proof; confirm Resend still works.

### Pass criteria

- [ ] Brevo selectable and savable
- [ ] Proof-ready email received via Brevo
- [ ] History note present after success
- [ ] (Optional) Resend still works when selected

Reply: `BREVO PASS` / `BREVO FAIL: …` / `BREVO PASS WITH NOTES: …`

### Owner result (2026-07-17)

- **BREVO PASS** — Owner: “You did it! It is working perfectly!” with Brevo Transactional Logs screenshot: **Sent / Delivered / First opening** for subject “Your Fresh Prints proof is ready” from `team@funkyfreshprints.com`.
- **UX A / UX B:** not separately confirmed in PASS reply → recorded at signoff as **absorbed / optional** (no FAIL).

---

## Combined reply template

```text
UX A: PASS | FAIL: …
UX B: PASS | FAIL: …
BREVO SECRET: SET | NOT YET
BREVO LIVE: PASS | FAIL: … | SKIPPED
```
