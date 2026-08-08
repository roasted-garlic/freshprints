# Studio Stale-Revision Disk Cache Verify

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner | `STUDIO STALE-REVISION REFRESH: OWNER RESTART COMPLETE` |
| Scope | **READ-ONLY** local verify |
| Verdict | **STUDIO STALE-REVISION DISK CACHE: PASS** |

---

## Path resolution

Resolved from **running** `electron.exe` process command line (`--user-data-dir`), not guessed:

`C:\Users\Roasted Garlic\AppData\Roaming\@fresh-prints\studio`

(Dev Studio uses package name `@fresh-prints/studio` for userData; matches live process.)

Cache file:

`C:\Users\Roasted Garlic\AppData\Roaming\@fresh-prints\studio\taxonomy-cache\v1.json`

---

## Verification

| Check | Result |
|-------|--------|
| File exists | **yes** |
| schemaVersion | **1** |
| revision | **2** |
| contentHash | `38e69b385168…bdd33e59` (full match expected live hash) |
| tagCount / categoryCount | **1121 / 18** |
| Structural validity | **PASS** (required fields + tag/category shapes) |
| Smoke alias absent | **yes** |
| `acdc.aliases` | `[]` |
| mtime (UTC) | `2026-08-08T03:49:06.165Z` (after owner restart) |
| Unexpected issues | **none** |

Note: same contentHash as revision 1 is expected; revision **2** is the cache-identity proof.

---

## Confirmations

- NO file modification / delete
- NO taxonomy mutation
- NO deploy
- NO production
- NO PR merge

**STOP.**
