# Final Studio remediations clean production-promotion checkpoint

- Clean branch: `release/final-studio-remediations`
- Production base: `11960852f45f948e37a1a5aeb3b09699882cd1fd`
- Development branch: unchanged; no reset, rebase, amend, squash, or force-push.
- Development owner QA: Whatnot **PASS**; Customer Upload intake **PASS**.
- Included source groups: Whatnot matched-show update and Customer Upload exclusion/restore/delete parity.
- Changed production Functions in source only: `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, `excludeCustomerUploadFromCatalog`.
- Production Functions deployment: **PENDING — not part of this promotion**.
- Combined production Studio installer: **PENDING until PR merge**.
- Production owner QA: **PENDING**.
- Stage 2: **PAUSED**.
- Domain cutover: **BLOCKED/DEFERRED**.

The clean branch excludes the unrelated development commits `f566bf1`, `462e3b2`, `6d20742`, `9cca806`, `e8ab27d`, `3c3620b`, `c2af84d`, and `fef69f8` and their unrelated rollout/settings artifacts.
