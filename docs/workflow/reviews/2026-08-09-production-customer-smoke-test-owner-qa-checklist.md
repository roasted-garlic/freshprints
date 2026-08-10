# Owner QA Checklist: Production customer smoke (Stage 2)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | **Production Portal hosted.app only** |
| URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Live build | **`build-2026-08-09-001`** @ `f5c0bdb` |
| Accounts | Existing safe test/customer account(s) |
| Do **not** use | `myprintrequest.com` for this QA (still Coming Soon) |
| Automated record | `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-automated-record.md` |
| Reply phrase | Owner: **`PROD CUSTOMER SMOKE QA: PASS`** (2026-08-09) |
| Result | **PASS** |
| Readiness verdict | **READY FOR CUSTOMERS** |
| Signoff | `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-signoff.md` |

---

## Why manual

Auth, Add to Request, DPI/sizing, artwork upload, submit/add-to-show, and request progress cannot be proven by HTTP alone. Agent automated checks already **PASS** for route load, traffic 100%, Algolia prod index bake-in, and no HTML project leakage.

---

## Prerequisites

- [ ] Signed out once, then hard-refresh hosted.app
- [ ] Prefer a known test customer (avoid real unpaid customer disruption)
- [ ] Have a small valid image ready for artwork upload (and optionally one that should fail DPI/format if you want to spot-check enforcement)
- [ ] Do **not** paste any API keys or secrets into chat

---

## Steps

### A. Shell / identity

1. Open hosted.app `/` → **Expected:** Portal loads; no error banner; feels like production (not `.dev`)
2. Open `/register` (or skip if using existing account) → **Expected:** registration form works or existing-account path clear
3. `/login` → sign in → **Expected:** session succeeds; lands in authenticated Portal
4. Spot-check you are **not** on a development project / wrong catalog

### B. Catalog browse / search / filter

5. Home / Discover browse → **Expected:** designs populate (Firestore browse path)
6. `/catalog` text search for a known ready design → **Expected:** sensible hits (managed Algolia)
7. Apply at least one facet/filter → **Expected:** results update; catalog does not stay blank forever  
   - Note: brief “Loading your account...” on filter transition is known **TD-032** (non-blocking polish) unless worse than before
8. Open a design detail → **Expected:** images/meta load; no permission error for public-ready design

### C. Request building

9. **Add to Request** from a design → **Expected:** item appears in Current Request
10. Open Current Request → **Expected:** line items visible; can adjust quantity/size where offered
11. Exercise **sizing / DPI enforcement** (reject or warn on too-small / invalid) → **Expected:** clear customer-safe message; cannot submit garbage silently
12. **Customer artwork upload** (custom path as applicable) → **Expected:** upload accepts valid file; invalid rejected with clear message

### D. Submit / progress

13. Submit / add request to show (test show if available) → **Expected:** success confirmation; no permission / Functions failure
14. **My Print Requests** / progress (`/requests` or equivalent) → **Expected:** new/updated request visible with sensible status
15. Confirm you only see **your** requests (privacy boundary)

### E. Mobile / errors

16. Resize or use phone → **Expected:** primary flows usable (nav, catalog, request, login) — basic sanity only
17. Watch for console/UI production errors, blank screens, or “internal” failures → **Expected:** none launch-blocking

---

## Pass criteria

- [ ] Login/registration path works
- [ ] Browse + search + filter usable
- [ ] Design details OK
- [ ] Add to Request + Current Request OK
- [ ] Sizing/DPI enforcement behaves
- [ ] Artwork upload OK (valid path)
- [ ] Submit / add-to-show OK
- [ ] Request progress visibility OK
- [ ] Privacy boundary OK (own data only)
- [ ] Mobile sanity OK
- [ ] No launch-blocking prod errors / permission failures
- [ ] Search still healthy (Algolia)

**Known non-blocking:** TD-032 filter “Loading your account...” flash — record as note if still present.

---

## Scoring guidance

| Outcome | When |
|---------|------|
| **READY FOR CUSTOMERS** | All pass criteria met; only cosmetic notes |
| **READY WITH NOTES** | Journey works; non-blocking polish/notes (e.g. TD-032) |
| **BLOCKED** | Auth, search broken, permissions, cannot submit, data leakage, or other launch-stopping defect |

Do **not** FAIL Stage 2 because `myprintrequest.com` is Coming Soon.

---

## Please reply with exactly one

- `PROD CUSTOMER SMOKE QA: PASS`
- `PROD CUSTOMER SMOKE QA: PASS WITH NOTES: [notes]`
- `PROD CUSTOMER SMOKE QA: FAIL: [description]`

After your reply, the agent will record the readiness verdict and—if READY / READY WITH NOTES—prepare the next checkpoint for **`APPROVE MYPRINTREQUEST.COM CUTOVER`** (cutover will **not** run until that separate approval).
