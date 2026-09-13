# DEV Deployment: Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `assisted-creation-multi-proof-selection` |
| Project | `fresh-prints-dev` |
| Result | **SUCCESS** |

## Deployed

```bash
firebase deploy --only functions:staffAddAssistedCreationProof,functions:customerRespondToAssistedCreationProof --project fresh-prints-dev
```

- `staffAddAssistedCreationProof` — Successful update
- `customerRespondToAssistedCreationProof` — Successful update

## Not deployed

- Production
- Portal App Hosting (localhost QA policy)
- Unrelated Functions
- Rules / Storage / indexes

## QA path

- Portal: `npm run dev:portal` → `http://localhost:3100`
- Studio: repo-standard DEV against `fresh-prints-dev`
