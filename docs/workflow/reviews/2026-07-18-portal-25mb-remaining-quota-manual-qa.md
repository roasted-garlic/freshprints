# Manual QA: Portal 25 MB + remaining daily quota

**Feature / area:** Portal Upload artwork + Donate designs  
**Why automated tests are insufficient:** Live callable + Storage rules + visual copy  
**Environment:** local Portal against `fresh-prints-dev`  
**Prerequisites:** Soft-reload Portal. Dev deploy already completed (storage + Functions).  
**Result:** **PASS** — owner 2026-07-18 (“The # upload capp seems PASSED”; covers 25 MB + remaining quota UI and follow-on polish)

### Steps
1. Soft-reload Portal → **Upload artwork** (`/requests/artwork` or equivalent) → **Expected:** header shows size up to **25 MB** (not 100 MB); a quota line like `N of M images left today · … upload starts … · … ZIPs … (resets at midnight UTC)`.
2. Soft-reload Portal → **Donate Designs** → **Expected:** same pattern with **donation** limits (higher than print-request if Settings defaults apply).
3. Upload a small valid PNG/WebP → **Expected:** succeeds; after processing finishes, remaining **images** (and upload starts if a new batch was charged) count decreases.
4. Optional: try a file over 25 MB → **Expected:** client and/or Storage reject with clear size message.
5. Optional: exhaust or hit a low test limit → **Expected:** exhausted message; remaining shows `0 of …`.

### Pass criteria
- [x] 25 MB shown on upload and donate
- [x] Remaining quota line visible before upload on both surfaces
- [x] Counts refresh after a successful upload batch
- [x] ZIP messaging aligned with Settings-derived max (follow-on polish; not stale hardcoded 2 GB alone)
- [x] No production deploy

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Owner reply (2026-07-18):** PASS — “The # upload capp seems PASSED”
