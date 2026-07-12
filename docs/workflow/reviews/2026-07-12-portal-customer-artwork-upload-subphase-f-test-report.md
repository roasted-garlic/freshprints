# Test Report: Portal Customer Artwork Upload — Sub-phase F

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-f-plan.md` |
| Environment | `fresh-prints-dev` |
| Result | **passed** |

---

## Commands Run

| Command | Exit | Notes |
|---------|------|-------|
| `node functions/scripts/smoke-customer-upload-subphase-f.mjs` | 0 | **12/12 PASS** (`mrhwesuy`) — human-approved |

No Function code changes in F (verification-only). No redeploy required.

---

## Smoke summary (`mrhwesuy`)

1. Attach two uploads to working request  
2. Promote approve fixture → AI `needs_review`  
3. Approve → `status: ready` + Portal catalog query sees design  
4. Upload stays `sent_to_ai_review` with `promotedDesignId`  
5. Promote reject fixture → reject → `status: rejected`  
6. Request item `customerUploadId` preserved; production Storage preserved; design original preserved; upload path unchanged  

---

## Verdict

**passed** — ready for signoff.
