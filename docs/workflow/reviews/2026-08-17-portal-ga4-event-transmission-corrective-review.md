# Review: Portal GA4 event transmission corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Reviewer | Review Agent (independent Formal Review — challenged Plan root-cause claim) |
| Plan | docs/workflow/plans/2026-08-17-portal-ga4-event-transmission-corrective-plan.md |
| Verdict | **approved_with_changes** |
| Goal | `portal-ga4-event-transmission-corrective` |
| Production source reviewed | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Live build | `fresh-prints-portal-build-2026-08-17-002` |

---

## Summary

Independent inspection confirms production queues `config` and manual `page_view` but emits **zero** `g/collect` requests, matching owner evidence. The implementation omits `gtag('js', new Date())`, which is part of Google's official gtag.js installation snippet and sets an internal library readiness flag (`tD.H`) in the loaded `gtag.js` runtime. That omission is a **confirmed non-conformant defect**, not an intentional reviewed deviation from the 2026-07-26 architecture.

**Causality is strongly supported but not experimentally proven in this review session.** The Plan's label **"CONFIRMED ROOT CAUSE (high confidence)"** overstates certainty. Formal Review requires downgrading that language and mandating **DEV/browser transport QA** (with `g/collect` proof) before production rollout. The proposed one-line bootstrap fix is architecturally correct and within scope; loader-aware `scriptReady` remains a conditional second step if bootstrap alone fails transport QA.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Bootstrap/transmission only; no GTM/EM/Secret Manager in this goal |
| Architecture alignment | pass | `js` bootstrap belongs in thin stub; controller keeps config/page_view ownership |
| Security impact addressed | pass | No new data exposure; sanitizer unchanged; host gate preserved |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | No App Hosting/Secret changes in Implement unless separate human gate |
| Test strategy adequate | pass with changes | Unit gap confirmed; must add bootstrap regression + mandatory transport QA |
| Human checkpoints identified | pass | Plan lists 15 gates; production QA must require `g/collect`, not tag detection |
| Roadmap alignment | pass | Corrective supersedes collection conclusion only; preserves historical PASS |
| Documentation plan | pass | Superseding finding + DEPLOYMENT transport QA note |
| No silent scope expansion | pass | Optional loader hardening is conditional, not default scope creep |

---

## Independent root-cause assessment

### What production proves (reproduced / accepted)

| Evidence | Finding |
|----------|---------|
| `gtag/js?id=<PRODUCTION_MEASUREMENT_ID>` in HTML, HTTP 200 | Loader present and valid |
| `window.gtag` + `window.dataLayer` after hydration | Stub executed; controller ran |
| dataLayer: `config` → `page_view` → `gtm.dom` → `gtm.load` | Commands queued; library eventually loaded |
| `gtm.uniqueEventId` on `config` entry | Library **processed** config (not merely queued forever) |
| **No** `["js", Date]` entry in dataLayer | Bootstrap command never enqueued |
| Zero `g/collect` / `analytics.google.com/g/collect` (owner + headless CDP) | No transport despite processed commands |
| No CSP header on `/` | CSP ruled out as blocker |
| Host gate | Config reached dataLayer → production host + enabled config confirmed |

### What source @ `124c6fa` proves

`PORTAL_GA4_STUB_SCRIPT` (`PortalAnalyticsScript.tsx`):

```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
```

No `gtag('js', new Date())` anywhere in repo (`git grep "gtag('js'"` on production tip → empty).

Controller still sole owner of `gtag('config', ...)` and `gtag('event', 'page_view', ...)` via `portalAnalyticsService.ts` — architecture intact, bootstrap incomplete.

### Google Tag Platform contract (external verification)

| Classification | Finding |
|----------------|---------|
| **A — Required behavior (for gtag.js installations)** | Official installation snippet at [Set up the Google tag with gtag.js](https://developers.google.com/tag-platform/gtagjs) always includes `gtag('js', new Date());` **before** `gtag('config', 'TAG_ID')`. GA troubleshooting docs show the same sequence as the correct tag form ([Troubleshoot tag setup](https://support.google.com/analytics/answer/9311124)). |
| **B — Recommended example** | Not applicable as a separate category — Google presents this as the installation snippet, not an optional enhancement. |
| **C — Inference (causality)** | Missing `js` **likely prevents hit transmission** even when `config`/`event` are processed: production shows processed config (`gtm.uniqueEventId`) with zero collect; minified `gtag.js` handler `ID.js` sets global flag `tD.H=true` only when `gtag('js', new Date())` is processed and multiple code paths execute `tD.H||S(43)` during config/event handling. |

**Formal Review does not rubber-stamp "missing js = zero collect" from snippet appearance alone.** The combination of (1) processed-but-not-transmitted commands, (2) absent `js` entry, (3) library internal gate on `js`, and (4) multi-environment zero-collect reproduction makes missing `js` the **primary hypothesis**. A controlled A/B local HTML experiment was attempted in this session but did not complete (Chrome CDP harness hung). **Implement/Test must run transport QA to confirm the fix.**

### Missing `gtag('js', new Date())` classification

**Confirmed defect; causality not fully proven at Formal Review stage.**

- **Confirmed defect:** Implementation is non-conformant with Google's gtag.js installation contract.
- **Causality:** Strongly supported; not definitively proven by A/B experiment in this review pass.
- **Not rejected:** Alternate hypotheses (consent, CSP, host gate, wrong ID, ad blockers) are adequately ruled out for production.

---

## Script-readiness / ordering assessment

### Lifecycle trace (production source)

```
layout.tsx → resolvePortalAnalyticsConfig
  → PortalAnalyticsBoundary
       → PortalAnalyticsScript
            ├─ portal-ga4-loader (external gtag.js, afterInteractive, no onLoad wired)
            └─ portal-ga4-stub (inline stub, onReady → scriptReady=true)
       → usePortalAnalyticsController(scriptReady)
            → initializeStream → gtag('config', ...)
            → trackPageView → gtag('event', 'page_view', ...)
```

### Answers to required questions

| Question | Answer |
|----------|--------|
| What does stub `onReady` prove? | The inline stub `<Script>` executed and Next.js considers it ready. It proves `window.gtag` exists as the **push-to-dataLayer stub**, not that external `gtag.js` finished loading or replaced processing logic. |
| Does it prove external gtag.js loaded? | **No.** Production shows `gtm.load` **after** config/event — external load completes later. |
| Is queuing before external loader completion supported? | **Yes, by design** — dataLayer queues commands until the library drains them. Google's standard pattern queues `js` first, then `config`. |
| Could current sequencing cause commands never to be processed? | **No** — production proves processing (`gtm.uniqueEventId`, `gtm.load`). Failure is **transport**, not total non-processing. |
| Should corrective include external-loader readiness? | **Conditional.** Not required in initial Implement scope. **Mandatory fallback** if bootstrap-only fix fails DEV transport QA. |

**Secondary factor:** stub-only `scriptReady` is a real lifecycle simplification but is **not the primary explanation** for zero collect, because the library did load and process commands.

---

## Alternate-cause assessment

| Hypothesis | Plausibility | Assessment |
|------------|--------------|------------|
| Missing `gtag('js', new Date())` | **High** | Primary hypothesis; confirmed defect |
| Stub `onReady` before external loader | Medium (secondary) | Real race; insufficient alone given `gtm.load` + processed config |
| Consent mode blocking all hits | Low | No consent API in Portal code; would not explain processed config with zero collect pattern as cleanly. GA4 Admin consent defaults remain **[NEEDS HUMAN INPUT]** but not blocking Implement planning |
| `send_page_view:false` suppressing all traffic | **Ruled out** | Manual `page_view` event present in dataLayer |
| Host gate / wrong ID / CSP / ad blockers | **Ruled out** | Plan evidence stands |
| Headless-only artifact | **Ruled out** | Owner multi-device DevTools matches |
| Duplicate stub replacing gtag | **Unlikely** | Standard single-stub pattern; library events fire |

No alternate cause is **equally or more plausible** than missing `js` given current evidence.

---

## Architecture review

**Findings:**

- Single-controller design preserved if fix adds **only** `gtag('js', new Date())` to `PORTAL_GA4_STUB_SCRIPT`.
- `gtag('js', ...)` is bootstrap/initialization, not config, page_view, route identity, or sanitizer logic — appropriate for the thin script layer per 2026-07-26 Plan intent (stub defines dataLayer/gtag; controller owns sequencing decisions).
- Controller remains sole owner of `send_page_view: false`, manual `page_view`, navigation identity, and sanitizer-derived descriptors.
- Production-only host gate unchanged (`portalAnalyticsHostGate.ts` / `resolvePortalAnalyticsConfig`).
- No second GA implementation, no GTM, Enhanced Measurement remains OFF (console — out of scope).
- Analytics failure remains non-blocking (service returns false if no gtag; no render crash).

**Required changes:**

- [ ] Plan must state explicitly: **`gtag('js', new Date())` in stub does not transfer config/page_view ownership to `PortalAnalyticsScript`.**
- [ ] If loader-aware `scriptReady` is added, it must not move any `gtag('config'|'event')` calls into the script component.

---

## Security / privacy review

**Findings:**

- Corrective does not widen data collection scope — only restores intended transport of already-sanitized hits.
- Sanitizer rules unchanged: `/requests/:id`, `/share/design/:id`, no raw IDs, no `q`, no `returnTo`, no raw `page_location`/`page_referrer` beyond sanitized descriptors.
- `allow_google_signals: false` and `allow_ad_personalization_signals: false` preserved in `initializeStream`.
- Production QA must **BLOCK + rollback** if raw prohibited context appears in hit params.
- Do not weaken production host gate for DEV testing (see Testing review).

**Human approval needed before production:**

- [ ] Production PR merge authorization
- [ ] App Hosting rollout authorization
- [ ] Production transport QA (owner)
- [ ] Rollback authorization if QA FAIL

---

## Testing review

**Findings (independent audit confirms Plan claims):**

| Claim | Verified |
|-------|----------|
| Unit tests mock `window.gtag` | **Yes** — `portalAnalyticsService.test.ts` and controller tests use push loggers |
| Tests prove calls/pushes, not GA transport | **Yes** |
| No test validates `js → config → event` sequence | **Yes** |
| `PortalAnalyticsScript.test.ts` encodes incomplete bootstrap | **Yes** — line 17–20: "only defines dataLayer and the gtag stub function" with no `js` requirement |
| 81/81 passing does not prove delivery | **Confirmed** |

**Required regression test (mandatory before Signoff):**

1. Assert `PORTAL_GA4_STUB_SCRIPT` includes `gtag('js'` (or equivalent) and that it appears **before** any controller-initiated calls in documented bootstrap order.
2. Test must **fail** against `124c6fa` stub constant and **pass** after fix.
3. Keep existing thin-component guarantees (no `config`/`set` in script source).

**Transport verification:**

- Pure unit tests are **insufficient** for transport proof.
- **Mandatory:** controlled browser/network test showing `g/collect` before production PR.
- Record commands, URLs, hit counts, and sanitized param samples in test report.

---

## DEV / browser verification review

**Findings:**

- Fresh Prints policy (`DEPLOYMENT.md`): no dev App Hosting; analytics host-gated to `myprintrequest.com`. **Do not weaken host gate** to enable GA on `localhost` or `fresh-prints-dev`.
- Safest pre-production transport methods (in priority order):

| Method | Safety | Notes |
|--------|--------|-------|
| **Owner-controlled `/etc/hosts` (or Windows hosts) mapping** a non-prod hostname to localhost **with test Measurement ID** | Acceptable with human checkpoint | Must use **test** GA4 stream ID, not production secret in repo; revert hosts after test |
| **Local static/Next dev + production hostname simulation** via hosts file | Preferred | Aligns with host gate without code change |
| **App Hosting preview** with documented test secret | Acceptable | Requires human approval for secret/env; must not leave GA enabled on dev project |
| **Controlled integration test harness** (Playwright/CDP against local server + hosts) | Acceptable | Best automation path; add to Test phase if feasible |
| Permanently enabling analytics on non-prod hosts in code | **Rejected** | Violates architecture and enablement decisions |

If no safe automated DEV transport path is available in Implement, the **strongest pre-production proof** is: local build with test ID + hosts-file hostname simulation + owner Chrome DevTools `collect` filter + DebugView — documented in test report.

**Any temporary test mechanism must not leave GA active on `fresh-prints-dev` or localhost without host gate.**

---

## Production corrective gates (future — confirm Plan)

Plan's 15-step gate sequence is **approved**. Additional Formal Review requirements:

1. Tag detection / Tag Assistant alone **MUST NOT** qualify as production QA.
2. Production QA **FAIL** if no `g/collect` after rollout.
3. Production QA **BLOCKED + rollback** if raw prohibited URL context in hits.
4. Verify exactly one initial `page_view` and one per meaningful client navigation.
5. Verify DebugView + Realtime during owner test window.
6. Verify non-production remains inert.

---

## Required changes to Plan (approved_with_changes)

1. **Downgrade root-cause wording** in Section E from **"CONFIRMED ROOT CAUSE"** to: **"Primary hypothesis — confirmed non-conformant defect (missing `gtag('js', new Date())`); causality strongly supported; must be confirmed by DEV transport QA showing `g/collect` before production."**
2. **Add explicit note:** processed `config` with `gtm.uniqueEventId` but zero collect is evidence of **processing without transport**, not failure to queue — strengthens but does not alone prove `js` causality.
3. **Mandate Implement/Test transport gate** as blocking for production PR — not optional.
4. **Document stub `onReady` ≠ external loader ready** in Plan lifecycle section (already partially present; make verdict explicit).
5. **Conditional scope:** if bootstrap-only fix fails DEV transport QA, Implement may add loader-aware `scriptReady` **without** plan re-review if limited to `PortalAnalyticsBoundary`/`PortalAnalyticsScript` readiness wiring only (no controller logic move).
6. **Branch discipline:** Implement from clean branch/worktree; do not mix dirty-checkout TD-030 files (unchanged from enablement review).
7. **Update acceptance criteria:** regression test must fail on `124c6fa` stub.

---

## Exact implementation boundaries (if approved after Plan edits)

| In scope | Out of scope |
|----------|--------------|
| Add `gtag('js', new Date());` to `PORTAL_GA4_STUB_SCRIPT` only | GTM, EM console changes, Measurement ID change |
| Update `PortalAnalyticsScript.test.ts` for `js` bootstrap + thin guarantees | `portalAnalyticsService.ts` config/page_view logic change |
| Optional: loader `onLoad`/`onReady` AND stub ready in `PortalAnalyticsBoundary` **only if DEV QA fails** | Sanitizer changes |
| New bootstrap sequence unit/integration tests | Host gate weakening |
| Test report with transport proof | Secret Manager / App Hosting during Implement without human gates |
| Workflow docs + superseding finding | TD-030 / dirty-checkout / tag-alias |

---

## Future human checkpoints

1. Plan revision acknowledgment (owner — optional if agent applies required Plan edits during Implement prep)
2. Implement complete
3. **DEV/browser transport QA** — must show `g/collect` (blocking)
4. Test phase Signoff
5. Production PR independent audit
6. Owner merge authorization
7. Merge to production branch
8. App Hosting preflight
9. Owner rollout authorization
10. App Hosting rollout
11. **Production transport QA** — `g/collect`, DebugView, Realtime, sanitized params, EM OFF, non-prod inert
12. Final corrective Signoff

---

## Blockers

None for **Implement planning** after Plan language is updated per Required Changes above.

**Production rollout remains blocked** until DEV transport QA and production transport QA pass.

---

## Verdict rationale

**approved_with_changes** — not **approved** because:

- Plan overstates causal certainty ("CONFIRMED ROOT CAUSE") without A/B transport proof in Formal Review.
- Mandatory transport QA and regression test requirements must be explicit Plan gates, not implied.
- Loader-aware readiness is correctly conditional but must be documented as fallback path.

**Not blocked** because:

- Defect is real and architecturally fixable with minimal scope.
- Evidence strongly favors missing `js` bootstrap over alternate causes.
- Privacy, host gate, and single-controller architecture are preserved by proposed fix.

---

## Next step

1. Apply Required Changes to Plan (wording + transport gate emphasis).
2. Proceed to **Implement** on a clean branch from `origin/development` or production tip per owner — **not** from dirty TD-030 checkout.
3. **STOP** — no Implement in this Formal Review session.
