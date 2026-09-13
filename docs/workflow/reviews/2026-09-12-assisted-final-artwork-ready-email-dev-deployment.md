# DEV Deployment: Assisted Final Artwork Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-09-12 |
| Goal | `assisted-final-artwork-ready-email` |
| Project | `fresh-prints-dev` |
| Status | deployed |

## Deployed

```bash
firebase deploy --only functions:staffAddAssistedCreationFinalSource,functions:onEmailDeliveryJobCreated --project fresh-prints-dev
```

- `staffAddAssistedCreationFinalSource` — Successful update
- `onEmailDeliveryJobCreated` — Successful update

## Behavior now live on DEV

1. Staff uploads final assisted artwork → transaction creates `emailDeliveryJobs` kind
   `assisted_final_artwork_ready` (idempotent id `assisted-final-{sha256}`).
2. Worker sends template “Your Fresh Prints final artwork is ready” with CTA to
   `https://myprintrequest.dev/custom-designs?flow=assisted&step=status`.
3. Honors `customers.assistedProofEmailOptIn` (same opt-out as proof-ready).
4. On send success: history note `Final artwork email sent`.
5. In-app Alerts: kind `assisted_final_artwork_ready` (“Final artwork ready”).

## Not deployed

- Production
- Unrelated Functions / Portal / Studio clients (no client deploy required for send path)
