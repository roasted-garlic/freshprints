# DEV QA: Customer Account Identity WS3 Merge Accounts

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Environment | `fresh-prints-dev` + local Studio |
| Production | **NOT AUTHORIZED** |
| Deploy | **corrective complete** — see Implementation Review (apply-only redeploy 2026-08-29) |

---

## ⚠️ Controlled QA rules

- Use **DEV test fixtures only** — never production customer accounts.
- Record customer IDs, Auth UIDs, request IDs, and Storage paths **before** Apply.
- Run **Preview smoke first** — do not Apply until Preview is truthful and non-mutating.
- No emulator E2E exists yet; this QA is the first real merge execution path.

---

## Post-deploy smoke (non-destructive)

Complete before any Apply:

- [ ] Studio reloads (`npm run dev:studio` against `fresh-prints-dev`)
- [ ] Users → Customers tabs: Active, Disabled, Closed, **Merged**
- [ ] Owner sees **Merge Accounts** (and Transfer Username)
- [ ] Admin/helper cannot merge
- [ ] Merge wizard opens without runtime errors
- [ ] Preview executes successfully
- [ ] Preview does **not** mutate customers or create `customerMergeJobs`
- [ ] Preview shows identities, inventory, working-request state with item counts, blockers, username outcome

---

## Fixtures

### Fixture A — Historical-data merge

**Source:** historical PR, allocation/favorite if practical, no conflicting meaningful working request.

**Survivor:** active canonical account.

Record before merge: all customerIds, Auth UIDs, usernames, PR IDs/names, allocation IDs, favorite IDs.

### Fixture B — Empty vs meaningful working requests

Dedicated pairs for B1–B7 below.

### Fixture C — Different Auth UIDs + uploads

Source and survivor with different UIDs + `customerUploads` (+ Assisted Creation if practical).

---

## Test matrix

| ID | Scenario | Expected |
|----|----------|----------|
| **A** | Preview | Truthful inventory; no mutation; checksum/previewId |
| **B** | Historical Apply | Job `completed`; survivor canonical; source merged tombstone |
| **C** | Print Requests | `customerId` → survivor; **name + snapshots unchanged** |
| **D** | CR → IR | Conversion linkage preserved if fixture includes converted pair |
| **E** | Allocations | `customerId` → survivor; frozen snapshots unchanged |
| **B1** | Source empty + survivor none | ALLOW; empty cleaned |
| **B2** | Source empty + survivor meaningful | ALLOW; source empty removed |
| **B3** | Source meaningful + survivor empty | ALLOW; survivor empty cleaned; source PR migrates |
| **B4** | Both empty drafts | ALLOW; no dual shells on survivor |
| **B5** | Source meaningful + survivor none | ALLOW; migrate source PR |
| **B6** | Survivor meaningful + source none | ALLOW; keep survivor PR |
| **B7** | Both meaningful | **BLOCK** — resolve one first |
| **Race** | Preview empty → add item → stale Apply | **REJECT** — require new Preview |
| **F** | Upload + Storage (Fixture C) | copy-verify-update-delete pattern |
| **G** | Assisted Creation | ownership + Storage migrate; staff actors unchanged |
| **H** | Favorites dedupe | A once, B once on survivor |
| **I** | Web Push | source invalidated; survivor untouched |
| **J** | Username default | survivor keeps username; source `merged-src-*` |
| **K** | Use source username | atomic transfer; fresh fixture |
| **L** | Auth | source login blocked; survivor login works |
| **M** | Merged directory | source under Merged tab with survivor link |
| **N** | Activity events | merge lifecycle events; historical `customerId` unchanged |
| **O** | `mergedSourceCustomerIds[]` | survivor lists source for WS4 alias queries |
| **P** | Resumability | N/A if no safe DEV injection path |
| **Q** | Guards | same account, merged source, lock → reject |
| **R** | Job status polling | truthful stage/progress in Studio |

---

## Critical race test (required PASS)

1. Preview a merge where a draft is **Empty**.
2. Before Apply, add a real print item to that draft via normal Portal flow.
3. Attempt Apply with the **old** preview checksum.

**Expected:** stale preview rejected; draft must **not** be deleted as empty.

---

## Owner response

Reply with one of:

- `PASS`
- `PASS WITH NOTES: …`
- `FAIL: …`

Record result below when complete.

### Owner response

**PASS** (2026-08-29)

Owner confirms:

- Transfer Username working correctly
- Merge Accounts completed successfully after stage-order corrective + DEV redeploy
- Merge result UI reported successful completion (Studio success styling/summary/refresh polished post-QA)
- Source account in **Merged** lifecycle; survivor remained canonical
- Operational history consolidated onto survivor
- Overall Transfer Username + Merge Accounts behavior working as intended

Corrective history retained in Implementation Review and Signoff.

## Index escalation

If Preview or QA throws a Firebase **missing index** error, capture the exact index spec from the error and authorize a **narrow DEV-only** index deploy — do not pre-deploy indexes speculatively.
