# Human Checkpoint: Upload caps #2 — deploy + manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Workflow | managed-phase / test / Small Managed Items #2 |
| Reason | Dev deploy approval + manual Settings/Portal verification |
| Status | **resolved** |
| Resolution | **PASS** 2026-07-18 — owner: “The # upload capp seems PASSED” |

---

## What We Need From You

1. Reply **`APPROVE DEV DEPLOY`** so Functions + firestore.rules can be deployed to `fresh-prints-dev` (not production).
2. After deploy, run the manual QA steps and reply **`PASS`** / **`FAIL: …`** / **`PASS WITH NOTES: …`**.

---

## Context

Implementation is complete in-repo. Caps are enforced server-side; Studio Settings writes via `updateCustomerUploadQuotaSettings`. Live behavior needs a dev deploy.

Manual QA: `docs/workflow/reviews/2026-07-18-upload-caps-studio-settings-manual-qa.md`

**Proposed defaults (already in code):** request 25/50/2 · donation 400/1000/40 — tunable live after deploy.

**Portal login for browser tests:** email `dev@funkyfreshprints.com`. No documented password found in repo setup docs — if you need the agent to log in for browser checks, provide the password once via this checkpoint (agents will not invent or commit it).

---

## Decision Required

**Question:** Approve dev deploy of upload-quota Functions + firestore.rules?

**Options:**
1. `APPROVE DEV DEPLOY` — proceed
2. Decline / wait

**Your decision:** `APPROVE DEV DEPLOY` obtained earlier; Functions + rules deployed to `fresh-prints-dev`.

---

## Manual Test Required

See `docs/workflow/reviews/2026-07-18-upload-caps-studio-settings-manual-qa.md`.

**Your result:** **PASS** — 2026-07-18 (owner message covers #2 upload caps + Portal limits polish)
