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

## Print-request completion authorization

- Staff completion updates only `status`, authenticated `updatedBy`, and server `updatedAt`.
- Firestore validates the full current request shape, including optional server-maintained
  `queueTab` and `showQueueBiddingAcknowledgment`.
- Those server-maintained fields remain client-immutable.
- Only the exact staff `active|editing -> completed` transition uses the completion branch;
  completed regressions remain denied except the established forward archive path.

## AI-specific

- Model calls only from Cloud Functions  
- Validate AI output before persist  

## Portal analytics identifiers

- Default: sanitizer templates dynamic IDs (`/requests/:id`) and drops `q` / `returnTo`.
- Owner exception (ADR-FP-138): PUBLIC catalog design IDs only, after successful resolve, on design `page_path` / `page_location` / `design_view.content_id`.
- Invalid share stays `/share/design/:id` with no `content_id`.

## Customer identity (WS1–WS4 DEV)

- Disable / restore / tombstone / hard-delete / merge / transfer — **owner-only callables**
- Merge and transfer use confirmation phrases + preview checksums
- Hard delete Apply gated to `fresh-prints-dev` until production authorization
- Portal cannot invoke staff identity or recovery operations

## Show Queue recovery (DEV)

- `previewShowProductionRecovery` / `applyShowProductionRecovery` — trusted server boundary; customers cannot invoke
- `upsertDevFixtureShow` — **fresh-prints-dev** project gate + staff auth; not available in production

## Owner Edit Show (scoped DEV enabler)

- Owner-only metadata mutation on eligible shows; not a customer/Portal path

## Incident posture

Fail closed; log risks in `RISK_REGISTER.md`; ADRs in `DECISIONS.md`.
