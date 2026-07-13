# Security Essentials

> Full doc: `docs/standards/SECURITY.md`

## Core principles

1. Never trust client input — validate in rules and/or Cloud Functions  
2. Least privilege  
3. Default deny  
4. No secrets in client bundles, logs, or chat  
5. UI gates are UX only — Firestore/Storage rules + callables enforce access  

## Roles

| Role | Studio | Portal |
|------|--------|--------|
| `owner` / `admin` / `helper` | Yes | No |
| `customer` | **No** | Yes |

Use Studio `permissionService` — never scatter role checks in components.

## Customer uploads

- Clients upload only to **their** `/customer-uploads/{uid}/…` paths  
- Size/type/path enforced in Storage rules + finalize callables  
- Transparency / DPI / format validation is **server-authoritative**  
- Ownership acknowledgement required to attach to a request  
- Catalog permission is optional; declining does not grant catalog write access  

## Secrets

| Secret | Where | Never in |
|--------|-------|----------|
| Gemini / AI keys | Firebase Secret Manager | Client, Firestore settings values |
| Firebase web config | Env (`NEXT_PUBLIC_*` / `VITE_*`) | Committed real secrets |
| Resend / other | Functions secrets | Client |

## Production changes need human approval

Auth provider changes, relaxing rules, new public sensitive endpoints, secret rotation, production deploys.

## AI-specific

- Model calls only from Cloud Functions  
- Validate AI output before persist  

## Incident posture

Fail closed; log risks in `RISK_REGISTER.md`; ADRs in `DECISIONS.md`.
