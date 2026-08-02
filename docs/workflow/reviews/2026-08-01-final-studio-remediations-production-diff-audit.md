# Final Studio remediations production diff audit

## Compared refs

- Production base: `11960852f45f948e37a1a5aeb3b09699882cd1fd`
- Development head before QA signoff documentation: `dde30b6a856d757f25c10ed9194fd463c331e38d`
- Comparison: `origin/production...origin/development`

## Approved remediation commits present

- `ca315f2391b4961dc97ddbe87bf351c335405c6a` — Whatnot existing-show update
- `7f92b10` — Donated Designs overflow menu
- `4b7f93d2ce384d85d0f7a9e95eb188ef9490daaa` — workflow cleanup
- `1bbd259` — preferred downward positioning
- `3ea70f7a365bf77900bb94dd191b680ee3b3e840` — Amendment 2
- `830f6e7267914aec0248bf95dce76d0643c3af66` — Amendment 3
- `1873b10d7874b36ba4cf95d2d0421e9c1f11bdd0` — Amendment 4
- `dde30b6a856d757f25c10ed9194fd463c331e38d` — development deployment checkpoint

## Blocking unrelated diff

The comparison also contains earlier production Portal/dual-limit rollout documentation commits:

- `f566bf1` — production schedule Functions deployment record
- `462e3b2` — production Portal schedule rollout record
- `6d20742` — production schedule visibility signoff
- `9cca806` — production dual-limit installer record
- `e8ab27d` — production dual-limit UI signoff
- `3c3620b` — linked limits 30/30 record
- `c2af84d` — linked-limit production verification closure
- `fef69f8` — Stage 2 hosted-smoke resumption record

Their changed files include production Portal/App Hosting, Functions deployment, Studio installer, settings-save, and Stage 2 documentation artifacts. Although these records describe previously approved actions, they are outside the narrowly authorized two-group final Studio remediation PR.

## Verdict

**BLOCKED — no PR opened.** The workflow explicitly requires stopping when the development-to-production diff contains unrelated Portal work. No cherry-pick branch, history rewrite, squash, rebase, or alternative PR was created because the requested PR head was specifically `development` and no expanded promotion approval was provided.

