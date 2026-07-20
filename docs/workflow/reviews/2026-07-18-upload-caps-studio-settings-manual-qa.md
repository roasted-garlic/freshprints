# Manual QA: Upload caps + Studio Settings (#2)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Feature | Small Managed Items #2 |
| Environment | Studio + Portal against `fresh-prints-dev` |
| Prerequisites | Owner reply `APPROVE DEV DEPLOY`; agent deploys Functions + rules (dev only) |
| **Result** | **PASS** — owner 2026-07-18 (“The # upload capp seems PASSED”) |

## Soft-reload

Restart Studio (or hard-refresh renderer) after deploy so Settings picks up the new section and callable.

## Steps

1. Sign in to **Studio** as **owner** → **Settings**.
   - **Expected:** Section **Customer upload quotas** with Print-request and Catalog donations columns; defaults 25/50/2 and 400/1000/40 (or previously saved values).
2. Change print-request **Images / day** to a temporary low value (e.g. `2`), save.
   - **Expected:** Success message; values persist after leaving Settings and returning.
3. In **Portal**, as a customer, attempt print-request artwork uploads until the daily image limit is hit (or use the temporary low value).
   - **Expected:** Clear exhausted-quota error mentioning today's limit and uploaded designs.
4. Raise the image limit in Studio Settings (or Reset to defaults + Save) and retry Portal upload.
   - **Expected:** Upload proceeds again without redeploying code.
5. Optionally spot-check **Donate** path still uses the higher donation caps (or temporarily lower donation image cap and confirm donation exhaust message says donated designs).

## Pass criteria

- [x] Owner-only Settings section visible and saves
- [x] Saved values persist and apply to Portal without code redeploy
- [x] Exhausted quota messaging reflects the configured limit
- [x] Non-owner cannot update (optional: confirm admin cannot save / section hidden)

## Please reply with

- `APPROVE DEV DEPLOY` — then agent deploys to `fresh-prints-dev` and you re-test
- After deploy + QA: `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

**Owner reply (2026-07-18):** PASS — “The # upload capp seems PASSED” (covers #2 upload caps + Portal remaining / layout / ZIP / 25 MB follow-ons)
