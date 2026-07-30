# Portal Residual Firestore Attribution Report

## Verdict

Portal R-015 generated-first catalog loading passed. The active client report recorded zero
Firestore operations, listeners, writes, callables, fallbacks, and errors while generated catalog
success events and Storage requests were present. That implementation remains closed.

The dominant residual reads are server-side Open Graph metadata reads, not generated-catalog reads.
The four Console writes are only partially attributable from retained logs.

## Exact interval checked

Cloud Function logs were queried read-only for project `fresh-prints-dev` for:

`2026-07-25T00:10:00Z <= timestamp < 2026-07-25T00:14:00Z`

The retained response contained repeated successful `getPortalGlobalOpenGraph` requests, including
seven requests between `00:10:24.875931Z` and `00:11:28.383986Z`. No Firestore-triggered publisher,
catalog callable, or write-producing Function was observed in that exact interval.

Immediately before the interval, at `00:09:56.682513Z`, logs show one successful
`registerWebPushSubscription` execution.

## Proven read source

`apps/portal/features/brand/portalGlobalSocialMetaService.ts` calls
`getPortalGlobalOpenGraph` with `cache: "no-store"` from Next metadata generation. Root layout,
Login, Register, and Help metadata all call the service. React `cache()` deduplicates within one
server request only; it does not cache across navigations or requests.

`functions/src/getPortalGlobalOpenGraph.ts` performs:

1. one read of `settings/portalSocialMeta`; and
2. when the configured/default image source is `library`, a ready-design query limited to 40.

The default source is `library`, and the sample constant is exactly 40. Therefore a library-mode
invocation returns up to 41 documents. Seven logged invocations can account for up to 287 reads.
Repeated invocations and Firebase minute-bucket alignment are consistent with the owner’s hundreds
of reads even though the browser tracer correctly recorded zero client Firestore work.

The Function currently emits request logs but not sanitized returned-document accounting, so this
historical interval cannot prove whether every invocation returned all 40 designs. Query Insights
was not available through the installed Firebase CLI; its per-query evidence must be checked in the
Firebase Console. The expected signature is a server/Admin query on `designs` constrained by
`status == ready`, ordered by `createdAt desc`, limit 40, plus single-document settings reads.

## Writes

The `registerWebPushSubscription` execution immediately before the requested interval is a proven
write-capable Portal Function invocation. It:

- reads the current subscription;
- merges the current subscription document (one write); and
- queries up to 25 enabled sibling subscriptions, writing each older sibling that must be disabled.

It can therefore explain a two-write Console bucket when one current token was written and one
older token was disabled. The retained logs do not prove a second invocation or another two writes
inside `00:10:00Z–00:14:00Z`. The remaining two Console writes stay bounded to:

- reporting delay/minute-bucket misalignment from another nearby push-registration execution;
- another open Fresh Prints client using the same dev project; or
- an unlogged/unretained direct client write.

They are not attributed to Portal without evidence.

## Portal SDK tracer coverage audit

Every direct Portal import/call of `getDoc`, `getDocs`, `getCountFromServer`, `onSnapshot`,
`setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, and `runTransaction` was searched.
No Portal use of `addDoc` or `runTransaction` exists.

Fully traced paths include authentication profile reads, generated-catalog fallback reads/counts,
favorites list reads, customer-upload primary reads/listeners, Help settings, notifications
listener, print-limit listener/read, and the primary print-request list/item/design reads.

Proven gaps:

- `portalBrandLogoSettingsService.subscribe` listener — fixed in this pass.
- notification `updateDoc`/`writeBatch` read-acknowledgement writes — fixed in this pass.
- notification-preference `updateDoc` calls.
- favorite `setDoc`/`deleteDoc` calls.
- several action-only print-request `getDoc`/`getDocs`/`updateDoc` calls (detail lookup, item lookup,
  allocation summaries, resize/notes/parent timestamp updates).
- Etsy recommendation request reads/listeners and suggestion-overlay reads/listener.
- some assisted-creation/customer-upload listeners in files that contain other tracing but do not
  wrap every raw call.
- the legacy category fallback `getDocs` call.

Those remaining gaps are not mounted/generated-catalog reads proven to have caused this idle
interval. They should be closed mechanically before using the client report as a whole-Portal
coverage assertion, but they do not reopen R-015.

## Smallest remediation plan

1. Cache/revalidate Portal global social metadata across server requests; do not use an unconditional
   `no-store` fetch for hourly metadata. Add sanitized Function accounting for settings/design
   returned counts before changing query behavior.
2. Complete trace wrappers around the bounded raw Portal SDK calls listed above, service by service,
   without payload or document logging.
3. In Query Insights, confirm the expected ready-design limit-40 signature for the historical
   interval and compare its operation count with `getPortalGlobalOpenGraph` request logs.
4. Run an isolated owner retest with all other Studio/Portal tabs closed.

The 132 generated Storage events are explicitly excluded from Firestore attribution. Repeated
manifest/card-bucket Storage work may be reviewed as a separate cache-efficiency follow-up.

## Owner retest

1. Close every Studio window and every other Portal tab using `fresh-prints-dev`.
2. Restart the newly built Portal, open one normal Portal tab, then open its debug popup.
3. Reset the report and confirm tracing says active.
4. Exercise the R-015 catalog flow once.
5. Leave both the main tab and popup open for at least five full idle minutes. Switching focus is
   allowed; do not close the popup or main tab.
6. Keep the debug session active until after the complete idle period, then copy the report.
7. Record exact UTC start/end seconds and compare Console usage using at least one minute of padding
   on both sides.
8. Capture Query Insights query signatures/counts for the same padded interval and Function request
   logs for `getPortalGlobalOpenGraph` and `registerWebPushSubscription`.

No deployment, republish, snapshot rebuild, rule change, or production action was performed.

---

## Metadata/tracer remediation implemented locally

The repository already established a one-hour metadata freshness interval. The correction therefore
uses 3600 seconds rather than introducing a new product policy:

- Portal metadata callers share one bounded result and in-flight request; Next fetch uses the same
  revalidation interval. Rejected Function loads are evicted and use the existing lightweight
  fallback for that call.
- The Function has a one-entry, one-hour warm-instance cache with hit/miss/in-flight accounting.
- Library mode reads the existing generated newest-card page instead of querying 40 Firestore
  designs. The candidate set remains the newest 40 public cards and uses the existing rotation
  selector.
- Development accounting logs only cache status, aggregate settings/design/total read counts,
  source mode, duration, outcome, and safe failure code.
- Session push sync reuses the current FCM token. The Function skips an unchanged current
  subscription write, keeps sibling reconciliation limited to 25, and logs aggregate reads/writes.
- Remaining Portal raw SDK operations identified above now have service-level read/listener/write
  trace lifecycle coverage. A repository coverage test asserts the audited surface and confirms
  `addDoc`/`runTransaction` remain absent.

Expected Firestore reads:

- metadata cache hit: 0;
- metadata miss, library/default: 1 social-meta settings read and 0 design reads;
- metadata miss, logo: 2 settings reads and 0 design reads.

Push registration reads two authorization/profile documents, one current-subscription document,
and—when enabled—a bounded sibling query (minimum billable query read; at most 25 returned sibling
documents). An unchanged current subscription writes 0 documents unless an older enabled sibling
must be disabled. A new/changed current subscription writes 1 plus the bounded older-sibling count.

Required dev deployment is limited to `getPortalGlobalOpenGraph` and
`registerWebPushSubscription`, followed by Portal App Hosting for the server/client cache, session
sync, and tracer changes. No generated asset republish is required.
