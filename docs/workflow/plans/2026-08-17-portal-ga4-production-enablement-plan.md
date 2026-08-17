# Plan: Portal GA4 production enablement

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Author | Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-review.md |
| Goal id | `portal-ga4-production-enablement` |
| Parent | signed-off `portal-google-analytics` (inert architecture, 2026-07-27); deferred checkpoint from `production-release` §3.6 |

---

## Goal

Enable the already-built, signed-off Google Analytics 4 architecture on live Fresh Prints Portal at `https://myprintrequest.com` by creating/confirming a production web stream, turning Enhanced Measurement fully off, supplying `NEXT_PUBLIC_GA_MEASUREMENT_ID` only to production App Hosting, rolling out Portal, and verifying sanitized single page views. Do **not** redesign or rewrite analytics code.

---

## Background

`portal-google-analytics` delivered an inert GA4 controller (`apps/portal/features/analytics/**`) that stays disabled unless a Measurement ID is present **and** the resolved origin is `myprintrequest.com` (or `www.`). ROADMAP item #5 is **Done** as inert architecture. Production-release plan §3.6 deferred the live property, Enhanced Measurement off, Measurement ID, and DebugView gate to a later checkpoint. Domain cutover is **CLOSED** and must not be reopened. TD-030 qty parity is LIVE on `build-2026-08-17-001` @ `f8acb26` and must not be changed.

This goal is that deferred production-enablement checkpoint only.

---

## Discovery (this session — repo + live, not historical docs alone)

### Git / branch relationship (blocking for Implement)

| Ref | SHA | Notes |
|-----|-----|--------|
| Local HEAD | `6a75998b7b0b144a8f0fc9cd0e73913e56567b38` | branch `fix/td-030-share-qty-parity` |
| `origin/development` | `799a852028d280b553cc5d81d32ac0ce783d53b0` | **ancestor of production** |
| `origin/production` | `f8acb26d76acdaed5f145138681f30b1d63c7257` | live App Hosting source (PR #79 merge) |
| merge-base(dev, prod) | `799a852…` | same as `origin/development` |
| `origin/development...origin/production` | `0 / 8` | development **0 unique**; production **8 unique** |

**Clean fast-forward of `development` to `production` is possible** (`development` is an ancestor of `production`). Production uniquely contains PR #79 (TD-030) plus production merge commits.

**Do not** auto-checkout, reset, stash, or commit. Current working tree is dirty and must be preserved (inventory below). Implement of this goal must start from **`origin/production` (`f8acb26`)**, not from stale `development`.

### Local files that must be preserved (do not discard / overwrite / stage into this goal)

Modified:

- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `docs/project/TECH_DEBT.md`
- `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-prod-pr-checkpoint.md`
- `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-signoff.md`
- `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-test-report.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`

Untracked (cutover / Studio 1.0.7 / tag-alias / TD-030 App Hosting closeout):

- `docs/workflow/plans/2026-08-16-myprintrequest-com-cutover-plan.md`
- `docs/workflow/plans/2026-08-16-portal-tag-alias-search-discoverability-plan.md`
- `docs/workflow/reviews/2026-08-15-studio-1.0.7-*` (6 files)
- `docs/workflow/reviews/2026-08-16-myprintrequest-com-cutover-*` (13 files)
- `docs/workflow/reviews/2026-08-16-portal-tag-alias-search-discoverability-plan-review.md`
- `docs/workflow/reviews/2026-08-17-portal-details-share-add-to-request-quantity-parity-app-hosting-rollout-checkpoint.md`
- `docs/workflow/reviews/2026-08-17-portal-details-share-add-to-request-quantity-parity-app-hosting-rollout-record.md`

This goal’s own plan/review files are additional untracked docs only.

### GA4 implementation inventory (paths verified)

Expected paths **exist** (no `[NEEDS REPO CHECK]` rename):

| Path | Role |
|------|------|
| `apps/portal/features/analytics/**` | Host gate, config, sanitizer, service, controller, script, boundary, tests |
| `apps/portal/app/layout.tsx` | Server Component; `resolvePortalAnalyticsConfig(process.env)` → `Providers` |
| `apps/portal/app/providers.tsx` | Mounts `PortalAnalyticsBoundary` |
| `apps/portal/.env.example` | Commented `NEXT_PUBLIC_GA_MEASUREMENT_ID=` |
| `apps/portal/apphosting.yaml` | Production env via Secret Manager; **GA ID deliberately omitted** |

`git diff origin/production --` those analytics/layout/providers/yaml/env.example paths: **empty** (production already contains this architecture; TD-030 did not touch it).

Live `https://myprintrequest.com/` HTTP 200; HTML grep for `googletagmanager` / `google-analytics` / `gtag(` / `G-…`: **0 matches**. Analytics is inert in production today.

`gcloud secrets list --project fresh-prints-prod` filter `GA` / `MEASUREMENT`: **no matching secrets**. Firebase prod apps: one web app (`Fresh Prints Portal Production`); no Measurement ID visible via this inventory.

GA4 property / web stream existence: **`[NEEDS OWNER CONSOLE]`** — not verifiable from Firebase App Hosting or Secret Manager in this session.

---

## Answers to required Plan questions

1. **Does production source still contain the signed-off GA4 implementation?** Yes. Architecture matches the 2026-07-26 plan: fail-closed config + host gate, sanitizer templates (`/requests/:id`, `/share/design/:id`), drops `q` / `returnTo` / raw IDs, `send_page_view: false`, `allow_google_signals` / `allow_ad_personalization_signals` explicit `false`, thin script, single controller, script-readiness handshake, analytics failure never throws.

2. **Is `NEXT_PUBLIC_GA_MEASUREMENT_ID` currently absent from production?** Yes — omitted from `apphosting.yaml`, no Secret Manager secret, live HTML has no gtag.

3. **What supplies App Hosting environment variables?** `apps/portal/apphosting.yaml` `env:` entries with `secret:` names in Cloud Secret Manager (`firebase apphosting:secrets:set <NAME> --project fresh-prints-prod`, then grant to backend `fresh-prints-portal` if needed). `NEXT_PUBLIC_*` use **BUILD + RUNTIME** because Next.js inlines them at build. Console backend env overrides YAML if both are set; documented preference is Secret Manager + YAML, not Console-only.

4. **Is a source-code change required?** No analytics rewrite. **Yes, a small config commit:** add the YAML `env` mapping for `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Do not commit the `G-XXXXXXXXXX` value.

5. **YAML vs existing config mechanism?** YAML mapping **is required** so the secret is injected. Creating a Secret Manager secret alone will not expose the var. Do **not** use Console-only env as the primary path (drift vs DEPLOYMENT.md).

6. **Will configuration require a new Git commit?** Yes — `apphosting.yaml` (+ DEPLOYMENT.md / ROADMAP / workflow artifacts). Value stays in Secret Manager.

7. **Production rollout after authorization?** After YAML is on `origin/production` and the secret exists+granted:

   ```bash
   firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit <production-tip-SHA> --force --non-interactive
   ```

   Backend `fresh-prints-portal`, project `fresh-prints-prod`. Same process as TD-030. **STOP** until owner phrase (Checkpoint C).

8. **Rollback?** Unset/delete the App Hosting secret mapping **or** roll App Hosting back to `f8acb26` / `fresh-prints-portal-build-2026-08-17-001` (pre-GA4). Fail-closed code returns to inert immediately without ID. Enhanced Measurement console setting is independent and should stay OFF.

9. **Verify Enhanced Measurement disabled?** Owner: GA4 Admin → Data streams → production web stream → Enhanced measurement gear → **main switch OFF**. DebugView: no `view_search_results`, `scroll`, `click`, `video_*`, `file_download`, form auto-events; **exactly one** `page_view` per navigation.

10. **Verify one page view per navigation?** DebugView/Realtime: one `page_view` on first load; one `page_view` per client-side route change; never two stacked automatic+manual. Baseline `first_visit` / `session_start` / `user_engagement` may still appear (not Enhanced Measurement; they are not extra `page_view`s).

11. **Verify sanitized paths?** Inspect **every** event in DebugView (manual `page_view` **and** automatic lifecycle events). Block if any shows raw `/requests/{id}`, design IDs, search text, `returnTo`, raw `page_location` / `page_referrer`, or other Section 6c.4 prohibited values. Templates such as `/requests/:id` and `/share/design/:id` are expected. **No `PASS WITH ACCEPTED RAW CONTEXT`.**

12. **Verify disabled outside myprintrequest.com?** Host gate uses `getPortalSiteOrigin`. Local/dev/tunnel remain inert even if someone pasted an ID locally (origin ≠ production host). Do not set the ID on `fresh-prints-dev` or in `.env.local`. Post-rollout: localhost HTML still has no gtag.

13. **Owner actions in Google Analytics / Firebase?** Create or confirm GA4 property + **Web** stream for `https://myprintrequest.com`; disable Enhanced Measurement fully; copy Measurement ID; confirm Decision 7 (privacy) before ID is applied; later DebugView QA. Optional: Firebase Console → Project settings → Integrations can link the same GA4 property; not required for this architecture (we use `gtag.js` + env ID, not Firebase Analytics SDK).

14. **Cursor vs owner?** Cursor: plan/review, later YAML/docs on a production-based branch, tests, preflight, rollout **command** after authorization (CLI may be hook-blocked). Owner: Git reconcilation decision; GA4 console; Decision 7 confirmation; authorize secret set; authorize App Hosting; production QA. Cursor must not print/request secret API keys. Measurement ID is public-by-design but still production-only.

15. **Privacy Policy — follow-up or production blocker?** **Production blocker for collection, per historical source of truth — not a new decision.** Owner Decision 3 and **Decision 7** in `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md` (and Formal Review Finding 11): no consent banner in the inert-code goal; **Privacy Policy + consent determination block real production enablement**. The 2026-07-27 signoff checkpoint listed privacy as deferred to production-release, not waived. This goal **does not draft** legal policy. Owner must explicitly confirm Decision 7 is satisfied **or** record a superseding product decision **before Checkpoint B** (applying the Measurement ID). Do not invent a waiver.

**Operational note on Decision 6 order:** historical Decision 6 listed supplying the ID *after* DebugView (circular). Follow production-release §3.6: Enhanced Measurement OFF **before** first traffic → set ID + YAML + authorized rollout → DebugView 6c.4 PASS/BLOCKED. If BLOCKED, rollback immediately.

---

## Scope

### In Scope

- Verify architecture still matches signed-off design (done in discovery; re-verify at Test)
- Owner create/confirm GA4 property + web stream for `https://myprintrequest.com`
- Enhanced Measurement **fully OFF**
- Secret Manager `NEXT_PUBLIC_GA_MEASUREMENT_ID` on `fresh-prints-prod` only
- `apphosting.yaml` mapping (`secret:`, BUILD + RUNTIME)
- Production App Hosting rollout after explicit authorization
- DebugView / Realtime verification (single sanitized page views)
- Confirm local/dev remain inert
- Test report + Signoff; DEPLOYMENT.md GA4 checklist update

### Out of Scope

- Rewriting analytics architecture / second library / GTM
- Advertising, remarketing, Google Ads, user IDs, ecommerce
- Studio analytics; Phase 10 dashboards; Firestore analytics events
- Functions, Rules, indexes, Algolia, Auth, DNS, Search Console, SEO
- TD-030 product changes; unrelated Portal polish
- Reopening myprintrequest.com cutover
- Privacy/legal drafting (owner confirmation only)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/apphosting.yaml` — add `NEXT_PUBLIC_GA_MEASUREMENT_ID` secret mapping
- `docs/standards/DEPLOYMENT.md` — record GA4 live checklist (EM off; production-only ID)
- Workflow artifacts under `docs/workflow/reviews/`
- ROADMAP / CURRENT-STATE / 13-recent at Signoff

### Architecture Impact

- [x] None (existing feature enabled via env)

### Security Impact

- [x] Details: Measurement ID is public-by-design (`NEXT_PUBLIC_*`), not a backend secret; still production-only. No PII to GA4 by sanitizer contract. Advertising flags stay `false`. Decision 7 remains a collection gate. Do not put the ID in Firestore.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: App Hosting env/secret + rollout only. No Functions/Rules/indexes.

### UI / UX Impact

- [x] Details: No visible UI change. Script loads only when enabled on production host. Failure must not block render (already implemented).

### Migration Impact

- [x] None

---

## Approach

**STOP before every production mutation.** Sequence:

### 0. Git reconcilation (owner) — before any Implement commit

Leave the dirty `fix/td-030-share-qty-parity` tree untouched. Later Implement: new branch from `origin/production` (`f8acb26`). Do not fast-forward `development` automatically in this goal unless the owner later asks; production enablement does not require updating `development` first. Do not stage unrelated local files.

### A. GA4 property / stream (owner console) — Human Checkpoint A

If a property+web stream for `https://myprintrequest.com` already exists, owner confirms Measurement ID and that Enhanced Measurement is **fully OFF**. If not, owner creates them (steps in Human Checkpoints below). Cursor does not create the property.

Also required before B: owner confirmation of Decision 7 (Privacy Policy / consent reviewed and approved for collection, **or** an explicit superseding recorded decision).

### B. Apply Measurement ID (owner authorize) — Human Checkpoint B

1. Owner provides `G-XXXXXXXXXX` (not a cryptographic secret; still do not scatter it into git).
2. After authorization: `firebase apphosting:secrets:set NEXT_PUBLIC_GA_MEASUREMENT_ID --project fresh-prints-prod` and grant to `fresh-prints-portal` if needed.
3. Commit YAML mapping only (no plaintext ID):

```yaml
  - variable: NEXT_PUBLIC_GA_MEASUREMENT_ID
    secret: NEXT_PUBLIC_GA_MEASUREMENT_ID
    availability:
      - BUILD
      - RUNTIME
```

4. PR into `production` from a branch based on `f8acb26`. **Do not merge** until Checkpoint C preflight.

Do **not** set this secret on `fresh-prints-dev`. Do not add to `.env.local`.

### C. App Hosting rollout — Human Checkpoint C

Preflight then STOP for:

`AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT`

Command as in question 7, using the merged production SHA. Expected: new `fresh-prints-portal-build-YYYY-MM-DD-00N` at 100%; `myprintrequest.com` healthy; gtag present only on that host.

Rollback target: `f8acb26` / `fresh-prints-portal-build-2026-08-17-001`.

### D. Verification / Signoff — Human Checkpoint D

Owner QA checklist (below). If 6c.4 BLOCKED → rollback, do not leave ID live. If PASS → Test report + Signoff.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Analytics unit tests | `npx tsx --test apps/portal/features/analytics/services/*.test.ts apps/portal/features/analytics/hooks/*.test.ts apps/portal/features/analytics/components/*.test.ts` | yes (no architecture rewrite; regression) |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes if YAML-only, still cheap; yes if any TS touched |
| Lint | `npm run lint` | yes if TS/YAML in ESLint scope; document pre-existing failures |
| Unit tests (other) | — | no |
| Build | `npm run build:portal` | yes before rollout |
| Integration | — | no |
| E2E | — | no (GA4 DebugView is manual) |
| Backend/rules | — | no |

### Manual

- [x] Owner GA4 console: stream URL + Enhanced Measurement OFF
- [x] Live `https://myprintrequest.com` still 200 after rollout
- [x] DebugView/Realtime: one `page_view` per load and per client navigation
- [x] No duplicate automatic page views
- [x] Sanitized paths; no prohibited values on **any** event (6c.4)
- [x] Catalog search does **not** emit `view_search_results`
- [x] Guest + signed-in pages still render
- [x] Localhost / non-production hosts: no gtag
- [x] Reply: `PROD GA4 QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …`

---

## Human Checkpoints Anticipated

- [x] Production deploy (App Hosting)
- [x] External service setup (GA4 property/stream)
- [x] Secrets / env vars (`NEXT_PUBLIC_GA_MEASUREMENT_ID` on prod App Hosting)
- [x] Privacy / consent (Decision 7) — historical blocker, owner confirmation required
- [x] Git reconcilation before Implement commits
- [ ] Manual UI/UX review (not a design change; QA is analytics)
- [ ] Database migration
- [ ] Auth provider changes

### Checkpoint A — Create or confirm GA4 property (beginner steps)

**Do not skip Enhanced Measurement off.** New streams default Enhanced Measurement **ON**.

1. Open [Google Analytics](https://analytics.google.com/) with the Google account that should own Fresh Prints analytics.
2. If a property for My Print Request / Fresh Prints Portal already exists, open it and skip to step 6.
3. Admin (gear) → **Create** → **Property**. Name e.g. `Fresh Prints Portal`. Time zone / currency as the business uses.
4. Skip optional business questions as needed → **Create**.
5. For platform choose **Web**. Website URL: `https://myprintrequest.com` (no path). Stream name e.g. `myprintrequest.com`.
6. Open the **Web** stream. Confirm URL is `https://myprintrequest.com`. Copy **Measurement ID** (`G-` followed by letters/numbers).
7. On that stream, open **Enhanced measurement** (gear). Turn the **main** Enhanced measurement switch **OFF**. Do not leave it on with only one sub-item unchecked.
8. Optional: Firebase Console → `fresh-prints-prod` → Project settings → Integrations → Google Analytics → link this property. Not required for this app’s `gtag.js` path.
9. Reply in chat with: stream confirmed for `https://myprintrequest.com`, Enhanced Measurement **OFF**, and either `GA4 STREAM READY` or that you pasted the Measurement ID only after Decision 7 is confirmed.

**Cursor will not create the property or apply the ID until you say so.**

### Checkpoint B — Apply production Measurement ID

Mechanism (after A + Decision 7):

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_GA_MEASUREMENT_ID --project fresh-prints-prod
```

Then grant if needed:

```bash
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_GA_MEASUREMENT_ID --backend fresh-prints-portal --project fresh-prints-prod
```

YAML mapping as in Approach B. Phrase to authorize: `AUTHORIZE PROD GA4 MEASUREMENT ID`.

### Checkpoint C — App Hosting

Return at that time: production SHA, backend, project, exact command, effects, rollback `build-2026-08-17-001` / `f8acb26`, preflight. Phrase: `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT`.

### Checkpoint D — Owner QA

See Manual tests. Phrase: `PROD GA4 QA: PASS` (or FAIL / PASS WITH NOTES).

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dirty local tree / stale `development` mixed into this goal | High | Branch from `origin/production` only; never stage unrelated files |
| Enhanced Measurement left ON → duplicate page views + `q` search leak | Critical | EM fully OFF before rollout; DebugView hard gate |
| Automatic `first_visit`/`session_start` carry raw URL | High | 6c.4 PASS/BLOCKED; rollback if BLOCKED; no accepted residual leak |
| YAML references missing secret → failed build | High | Create+grant secret before merge/rollout |
| Decision 7 ignored | High | Checkpoint B blocked until owner confirmation |
| ID set on dev/local | Medium | Host gate + never set secret on `fresh-prints-dev` |
| CLI rollout hook-blocked | Medium | Owner allow/run, same as TD-030 |
| Scope creep into Phase 10 / Ads / GTM | High | Out of scope list |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Preferred: remove App Hosting env mapping and/or secret, rollout previous production SHA `f8acb26d76acdaed5f145138681f30b1d63c7257` (`fresh-prints-portal-build-2026-08-17-001`).
2. Code remains fail-closed without ID — Portal still renders.
3. Do not delete the GA4 property as part of rollback unless owner asks; leave EM OFF.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md (only if env inventory lives there — prefer DEPLOYMENT.md)
- [x] DEPLOYMENT.md — GA4 now configured; EM OFF checklist
- [ ] TESTING.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — only if owner records a superseding Decision 7; otherwise cite 2026-07-26 Decisions 3/5/6/7
- [x] ROADMAP / CURRENT-STATE / 13-recent at Signoff
- [x] Other: this plan, review, later test report, rollout record, signoff

---

## Open Questions

- [x] Does a GA4 property/stream already exist? **Owner Checkpoint A**
- [x] Decision 7 privacy/consent for collection? **Owner before Checkpoint B** (historical blocker)
- [ ] None remaining that block *planning*

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-review.md
- Verdict: approved_with_changes
