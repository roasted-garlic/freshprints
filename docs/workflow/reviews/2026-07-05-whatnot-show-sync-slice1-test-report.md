# Test Report: whatnot-show-sync — Slice 1 (verification spike)

**Date:** 2026-07-05
**Scope:** Implementation slice 1 only, per explicit user approval — base URL validation utility +
one dev-only, validated, manual verification fetch against the default Whatnot show base URL. No
scheduled Function, no callable Function, no Firestore writes, no live sync button, no Firebase deploy.

## Files changed

- `shared/utils/whatnotShowBaseUrl.ts` (new) — `parseWhatnotShowBaseUrl()`, a strict allowlist
  validator for the staff-configurable Whatnot show base URL (`https:` only, `www.whatnot.com` exact
  host, `^/user/<username>/shows/?$` path, no query/fragment/port).
- `shared/utils/whatnotShowBaseUrl.test.ts` (new) — 14 tests.
- `docs/workflow/plans/2026-07-05-whatnot-show-sync-plan.md` — added Section 7A with the verification
  spike's findings; updated the plan's status header.
- This test report (new).

No renderer, Electron, or `functions/` source file was created or modified. No dependency was added.

## Dev-only external fetch performed

**Yes, exactly once**, per the explicit approval boundary:

- URL fetched: `https://www.whatnot.com/user/funkyfreshprints/shows` (the default base URL, validated
  through `parseWhatnotShowBaseUrl()` before the fetch — the script refused to fetch anything the
  validator rejected).
- Method: a one-off, non-committed Node script run manually from the scratchpad directory, never
  wired into the application, never scheduled, never deployed. Used `fetch()` with `redirect: "manual"`
  (no automatic redirect-following) and a standard desktop browser `User-Agent` header. Deleted
  immediately after use, along with the captured raw response.
- No other URL, host, or path was fetched. No arbitrary staff-entered URL was involved — only the
  hardcoded default.

## Result

**HTTP 403 Forbidden.** The response is a Cloudflare managed-challenge interstitial ("Just a
moment..."), not Whatnot's application — see the plan's new Section 7A for full technical detail
(challenge script markers, CSP scoped to `challenges.cloudflare.com`, absence of `__NEXT_DATA__`,
`application/ld+json`, `/live/` anchors, or any UUID pattern in the body).

**Conclusion: a plain, unauthenticated server-side fetch cannot reach Whatnot's show-list content at
all.** This is a harder blocker than "which parser to use" — it blocks *any* content from being
fetched by the originally-planned approach (Cloud Function + plain `fetch()`), regardless of parser
sophistication. Full detail, the specific answers to all 11 verification questions, and a menu of
possible paths forward (each requiring its own separate approval) are recorded in the plan's new
Section 7A.

## Tests added/updated

`shared/utils/whatnotShowBaseUrl.test.ts` — 14 new tests: accepts the default URL; accepts a trailing
slash; accepts a different valid username; trims whitespace; rejects non-HTTPS; rejects non-Whatnot
domains (including bare `whatnot.com` and other subdomains, since this validator is intentionally
stricter than the existing `parseWhatnotShowUrl()`); rejects a query string; rejects a fragment;
rejects a non-default port; rejects arbitrary Whatnot paths (including a single-show `/live/<id>` URL
used as a base URL); rejects `javascript:`/`data:`/`file:` schemes; rejects blank/malformed input
without throwing.

No fixture-based show-list parser tests were added — per the finding above, there is no reachable
content to build or test a parser against yet, and fabricating synthetic fixture data for content that
cannot actually be obtained would misrepresent the state of this feature.

## Verification

- `npx tsx --test shared/utils/whatnotShowBaseUrl.test.ts shared/utils/whatnotShowUrl.test.ts` —
  **23/23 passing** (14 new + 9 pre-existing, unchanged)
- `npx tsx --test $(all *.test.ts under shared/ and src/)` — **397/397 passing**, no regressions
- `npx tsc --noEmit` — PASS
- `npm run lint` — PASS
- `npx vite build` — PASS (renderer, Electron main, preload), pre-existing circular manual-chunk
  warning only
- `git diff --check` — PASS, pre-existing CRLF warnings only

No `functions/` code was touched in this slice, so no Functions-specific compile/test step applies.

## Not performed

No Firestore writes (scraped or otherwise), no Firebase/Functions/Firestore rules/index deploy, no
scheduled Cloud Function, no callable Function, no live sync button, no secrets, no new npm
dependency, no browser-automation dependency (Puppeteer/Playwright or similar), no migration, no
backfill, no Portal, no Custom Requests, no ecommerce, no shipping, no gang-sheet export, no image
mutation, no `designs.status` write. Exactly one dev-only, validated, manual HTTP fetch was performed
against the default Whatnot base URL, as explicitly approved.

## Recommended next step

**Not** "implementation slice 2" as originally numbered in the plan — that slice assumed reachable
content to parse, which this spike disproved. Instead, recommend returning to the user with the
Section 7A findings and the four-option menu (headless browser / third-party rendering proxy /
investigate an official Whatnot integration / continue with manual Add Show only) for a decision on
whether and how to proceed, before any further code is written for this feature.
