# Coordinated production Rules rollback snapshot — read-only capture

| Field | Value |
|---|---|
| Date | 2026-09-13 (America/Chicago) |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Project | `fresh-prints-prod` |
| Capture mode | Read-only Firebase Rules API GETs; no deploy, replace, publish, or data access |
| Credential handling | Owner-authorized account/quota context used; no token or secret values recorded |

## Firestore Rules

| Field | Value |
|---|---|
| Release resource | `projects/fresh-prints-prod/releases/cloud.firestore` |
| Release ID | `cloud.firestore` |
| Ruleset resource | `projects/fresh-prints-prod/rulesets/42adfbb5-9f5d-4d22-a07b-e38078aba074` |
| Ruleset ID | `42adfbb5-9f5d-4d22-a07b-e38078aba074` |
| Release created | `2026-07-30T17:28:21.600077Z` |
| Release updated | `2026-08-24T15:32:06.614257Z` |
| Ruleset created | `2026-08-24T15:32:04.051487Z` |
| Service metadata | `cloud.firestore` |
| Source export | `firestore.rules` retrieved from `rulesets.get` |
| Source bytes | 94,557 UTF-8 bytes/chars as returned; no normalization |
| Source SHA-256 | `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad` |
| Raw ruleset JSON SHA-256 | `ea16ba67aca65b70d07dcbd70cd7e65b39b6c975adbd353b612cc9353045aa53` |

## Storage Rules

| Field | Value |
|---|---|
| Release resource | `projects/fresh-prints-prod/releases/firebase.storage/fresh-prints-prod.firebasestorage.app` |
| Release ID | `firebase.storage/fresh-prints-prod.firebasestorage.app` |
| Ruleset resource | `projects/fresh-prints-prod/rulesets/0c911fca-b6bf-48cd-83c8-e0622f334767` |
| Ruleset ID | `0c911fca-b6bf-48cd-83c8-e0622f334767` |
| Release created | `2026-07-30T18:06:27.477466Z` |
| Release updated | `2026-08-11T20:45:02.917649Z` |
| Ruleset created | `2026-08-11T20:45:02.442655Z` |
| Service metadata | `firebase.storage` |
| Source export | `storage.rules` retrieved from `rulesets.get` |
| Source bytes | 10,177 UTF-8 bytes/chars as returned; no normalization |
| Source SHA-256 | `69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306` |
| Raw ruleset JSON SHA-256 | `d7ad71bb60a49139bb354511e3865812010291628680ead49b8102881deecf21` |

## Reproducibility

Source hashes are SHA-256 over the UTF-8 bytes of each single `source.files[*].content` value
returned by the Rules API, preserving returned line endings. Raw JSON hashes cover the complete
`rulesets.get` response bytes. Endpoints used:

- `GET https://firebaserules.googleapis.com/v1/projects/fresh-prints-prod/releases`
- `GET https://firebaserules.googleapis.com/v1/projects/fresh-prints-prod/rulesets/42adfbb5-9f5d-4d22-a07b-e38078aba074`
- `GET https://firebaserules.googleapis.com/v1/projects/fresh-prints-prod/rulesets/0c911fca-b6bf-48cd-83c8-e0622f334767`

The Rules rollback-evidence blocker is **CLOSED**. No production Rules, Firestore, Storage, Auth,
settings, secrets, IAM, indexes, Functions, or data mutation occurred.
