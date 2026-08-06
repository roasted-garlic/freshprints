# Manual Test Checkpoint — Catalog mats, ready order, Assisted proof 80 MB

**Branch:** `fix/post-launch-catalog-and-processing-stability`  
**Environment:** `fresh-prints-dev`  
**Note:** Mats + ready ordering shipped in `42f7b20`. Proof 80 MB source in `982855c`.
**Dev deploy completed 2026-08-06** (storage + three Functions on `fresh-prints-dev`) —
see `docs/workflow/reviews/2026-08-06-assisted-creation-proof-80mb-dev-deploy.md`.

## Background

1. Light transparent design + dark mat → card, Details thumbnail, lightbox match.
2. Download original → still transparent.

## Ordering

3. New approval → first in Studio Design Library.
4. Same design first in Portal ordinary browse.
5. Re-approve older design → moves to top.
6. One category + one tag → newest-approval-first; no disappear/dupe.

## Assisted proof 80 MB

7. Upload proof **> 25 MB and < 80 MB** → accepted; preview works; submit to customer succeeds (**requires deployed Rules**).
8. Select proof **> 80 MB** → reject: `Proof must be 80 MB or smaller.`
9. Customer reference-image / other upload limits unchanged.

### Please reply

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

**Do not Signoff until owner replies.** No PR merge / Firebase deploy from this agent.
