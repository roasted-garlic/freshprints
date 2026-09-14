# Coordinated Production `OPENAI_API_KEY` Prerequisite — Read-Only Verification

**Date:** 2026-09-13
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Frozen candidate:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Project:** `fresh-prints-prod`

## Owner authorization and scope

The owner authorized only resolution of the missing production `OPENAI_API_KEY` prerequisite
and retry of the already-reviewed explicit Function deployment. The frozen candidate, Function
allowlist, and all unrelated production settings, secrets, Auth, data, and configuration remain
out of scope.

## Read-only verification

- Secret Manager inventory was queried by name only. `OPENAI_API_KEY` is absent from
  `fresh-prints-prod`.
- `gcloud secrets describe OPENAI_API_KEY --project=fresh-prints-prod --format=json` returned
  `NOT_FOUND` for `projects/473623863375/secrets/OPENAI_API_KEY` (authenticated account metadata
  only; no secret value was requested or displayed).
- The frozen source expects exactly the reviewed secret name: `functions/src/lib/secrets.ts`
  defines `defineSecret("OPENAI_API_KEY")`; the OpenAI provider resolvers select
  `OPENAI_API_KEY` for provider `openai`.
- The production secret inventory contains no alternate reviewed OpenAI/GPT secret name. Existing
  names were inspected as identifiers only; values were never read.
- Frozen source/config bytes remain unchanged. Creating the missing secret does not require a
  source or configuration byte change.

## Owner-interactive creation command

The owner must run the repository/Firebase-supported interactive flow in an authenticated terminal:

```text
firebase functions:secrets:set OPENAI_API_KEY --project fresh-prints-prod
```

The value must be entered only at the interactive prompt. It must not be sent in chat, placed in
an argument, written to `.env`, Firestore, workflow documentation, logs, or Git. The agent has not
created or handled the value.

## Function retry gate

After the owner confirms metadata-only readiness (secret exists and has at least one enabled
version), retry only the reviewed explicit Function deployment against the unchanged frozen SHA:
**164 targets = 54 ADD + 110 UPDATE**; **3 RETAIN LIVE VERSION**, **10 EXCLUDE**, and **9 NO
ACTION**. Hard-delete and DEV-only exports remain excluded. No broad Functions deploy is permitted.

Until that owner confirmation is received, the Function deployment remains **not run**. The prior
preflight stopped before mutation with the missing-secret error; production inventory remains
113/113 ACTIVE and projection triggers remain absent.

## Production boundary

No secret was created by the agent. No Function or Rules deployment, production merge, Studio or
Portal publication, maintenance activation, runner DRY RUN/VERIFY/APPLY/backfill, or production
data/settings/Auth/IAM mutation occurred in this checkpoint. The previously authorized additive
index deployment is unchanged and remains the only production mutation recorded for this rollout.

**Next owner checkpoint:** `OWNER CONFIRM OPENAI_API_KEY METADATA READY / AUTHORIZE FUNCTION PREFLIGHT RETRY`
