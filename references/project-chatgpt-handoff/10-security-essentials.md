# Security Essentials

> Full doc: `docs/standards/SECURITY.md`

## Coordinated projection cutover (closed 2026-09-12)

- `portalPrintRequestItems` is the least-privilege customer projection; writes are Admin-only and
  Portal never reads `staffArtworks` directly.
- The transition Rules artifact retains the customer-owned canonical item read while projection rows
  converge. The authoritative final Rules state permits projection reads and denies that canonical
  customer read after the rollout gates pass.
- Authenticated customers may access only Staff Artwork preview/thumbnail derivatives by known ID;
  the owner accepted this residual risk for this release. Originals, interactive assets, private
  metadata, and Staff Artwork Firestore documents remain denied. `SECURITY.md`, `FIREBASE.md`, and
  `RISK_REGISTER.md` carry the synchronized record.
- The production runner is hard-pinned and APPLY is separately owner-gated; no production access or
  mutation occurred during this closed repository-readiness child.

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

## Portal maintenance mode (DEV)

- `settings/portalMaintenance` is controlled only through owner/admin callables; direct client
  writes remain denied.
- The public state projection contains only enabled status, customer-safe heading/body copy, and a
  caller-specific tester boolean; configured tester UIDs and audit fields never leave the trusted
  backend.
- Tester eligibility requires an active customer-role user with exactly one linked customer record;
  guest, deleted, disabled, merged, orphaned, and inactive accounts are excluded.
- The shared maintenance guard revalidates eligibility before covered customer mutations and fails
  closed on state or eligibility read errors. The tester bypasses only the maintenance prohibition,
  not ownership, quota, lifecycle, upload, or other business rules.

## Show Queue recovery (DEV)

- `previewShowProductionRecovery` / `applyShowProductionRecovery` — trusted server boundary; customers cannot invoke
- `upsertDevFixtureShow` — **fresh-prints-dev** project gate + staff auth; not available in production

## Owner Edit Show (scoped DEV enabler)

- Owner-only metadata mutation on eligible shows; not a customer/Portal path

## Interactive upscale + catalog originals (DEV — 2026-08-31; hydration corrective 2026-09-03)

- `setPrintRequestItemArtworkEnhanceMode` — staff + Portal customer (own items); server generates/selects derivatives; new generation only when baseline effective DPI `< 250`
- Legacy `enhancePrintRequestArtwork` shares the same core gate
- Client remount/reload DPI uses patched design/upload `interactiveEnhanced*` (not card-local state alone)
- Storage: staff may read `/originals/{designId}.interactive.png` for production export; customer-upload interactive derivatives remain under `/customer-uploads/{uid}/…`
- Firestore: optional `artworkEnhanceMode` and related fields on `printRequestItems`; gang sheet snapshot paths may reference interactive derivatives
- Customer item resize (Portal-editable keys only) uses reduced-cost Rules path; upscale metadata remains immutable on that path
- No secrets in client; derivative creation Admin/server-controlled for catalog

## Incident posture

Fail closed; log risks in `RISK_REGISTER.md`; ADRs in `DECISIONS.md`.
