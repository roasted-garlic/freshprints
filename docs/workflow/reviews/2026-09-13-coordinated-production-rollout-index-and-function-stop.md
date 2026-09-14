# Coordinated Production Rollout — Index PASS / Function Preflight STOP

**Date:** 2026-09-13
**Candidate:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Project:** `fresh-prints-prod`

## Production GO and frozen-source checks

The owner authorized production GO for the exact frozen candidate. Before mutation, the candidate
SHA, clean immutable manifests, zero runtime/config drift, and production baseline continuity were
verified. No candidate bytes changed.

## Step 1 — additive indexes: PASS

The frozen `firestore.indexes.json` hash was verified as
`2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`. Firebase deployed the
reviewed additive union without `--force`; existing indexes were retained and no deletion/replacement
was proposed. Read-only polling completed with **94 composite indexes READY** (77 retained plus 17
new composites; the 18th additive change is represented by the reviewed field-override additions),
and the `portalPrintRequestItems` projection index is **READY**. The deployed candidate definition
set remains 95 entries / 18 additive / 0 removed or replaced.

## Step 2 — explicit Functions allowlist: STOP before deployment

The reviewed allowlist was mechanically derived from the frozen/current and production exports:
**164 targets = 54 ADD + 110 UPDATE**, with 3 RETAIN LIVE VERSION, 10 EXCLUDE, and 9 NO ACTION.
The command was explicit (`--only functions:<name>,...`) and excluded all hard-delete/DEV-only
exports. Firebase preflight stopped before any Function deployment because the frozen allowlist
requires the production secret `OPENAI_API_KEY`, but Secret Manager returned **404 NOT_FOUND** and
Firebase reported:

> `Error: In non-interactive mode but have no value for the secret OPENAI_API_KEY: OPENAI_API_KEY`

The preflight did not deploy Functions. A subsequent read-only inventory remains **113/113 ACTIVE**;
`onPrintRequestItemPortalProjectionWritten` and `onStaffArtworkPortalProjectionRefreshWritten`
are absent, confirming no projection Function mutation occurred.

## Boundary and stop

Because production secrets are explicitly unchanged and no owner authorization exists to create or
modify `OPENAI_API_KEY`, the reviewed Function step cannot proceed. Do not alter the allowlist or
continue to transition Rules, production merge, Studio stable publication, Studio QA, Portal rollout,
projection runner, or any later step. The additive index deployment is the only production mutation
performed in this turn; no data, Auth, settings, maintenance, or other production state was changed.

**Required owner checkpoint:** resolve the missing production `OPENAI_API_KEY` prerequisite under a
separate explicit secret/configuration authorization, then re-run only the reviewed Function
preflight/deployment step against the unchanged frozen candidate. No APPLY/backfill is authorized.
