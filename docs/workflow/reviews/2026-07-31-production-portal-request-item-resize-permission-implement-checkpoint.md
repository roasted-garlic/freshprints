# Checkpoint: Implement complete — await production Firestore Rules deploy

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-request-item-resize-permission` |
| Implement approval | `APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION` |
| Automated tests | **passed** — see test report |
| Production Rules | **deployed** 2026-07-31 — see rules-deploy-checkpoint |

---

## Implemented (repo only)

| Change | Path |
|--------|------|
| Allowlist + optional bool + immutability for `requestCountApplied` | `firestore.rules` |
| Emulator resize suite | `tests/firebase/printRequestItemResize.rules.test.ts` |
| `test:rules` includes new suite | `package.json` |
| Source alignment assertions | `packages/shared/.../printRequestLimitSettingsRulesAlignment.test.ts` |
| DATA_MODEL + shared type optional field | `docs/architecture/DATA_MODEL.md`, `packages/shared/.../printRequest.types.ts` |

No Portal/Studio runtime changes. No Functions changes. No production data changes.

---

## Required next human action

Deploy Firestore Rules to production (and optionally verify on `fresh-prints-dev` first):

```bash
firebase deploy --only firestore:rules --project fresh-prints-prod
```

Suggested approval phrase:

```text
APPROVE PRODUCTION FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION
```

Optional pre-prod:

```text
APPROVE DEV FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION
```

After production deploy: owner QA size autosave on **Studio and Portal** catalog items → then Stage 2 remains separately gated.

## Rollback

Redeploy prior `firestore.rules` from git / Console rules history.
