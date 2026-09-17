# Review: Studio `v1.0.15` Release Upload Hardening

## Verdict

**Approved for implementation.**

## Review basis

- The latest required run (`35267405560`) built Windows and both Mac architectures successfully, then failed on the exact same-SHA draft (`release_id=391027008`) when GitHub returned HTTP 500 for `Fresh-Prints-Mac-arm64-1.0.15-Installer.zip`.
- The current finalizer deletes every existing asset before uploading and performs one unverified curl attempt per asset. This explains why transient upload failure loses already completed upload work and blocks final verification.
- The proposed change remains limited to the existing finalizer, its narrowly related upload helper, and focused contract tests. The helper must be promoted with the workflow because the finalizer checks out the exact production build SHA; the protected promotion gate ensures both files exist on that SHA at runtime. It preserves the current production reachability, exact SHA, exact release ID, draft-only, canonical naming, dual-platform, and non-stable validation gates.
- Per-asset cleanup is safe because the asset ID is first read from `releases/${RELEASE_ID}/assets`; no other release or draft is queried for deletion.
- Bounded retry classification is explicit: retry `429/500/502/503/504` and network failures; fail immediately for other HTTP failures; fail after a fixed maximum attempt count with response diagnostics.
- Mac artifact upload compression level `0` is appropriate for DMG/ZIP release binaries and is scoped to the Mac artifact step. Windows remains unchanged.

## Acceptance criteria

- HTTP `200` and `201` succeed immediately.
- Transient `500` and `502` recover on a later bounded attempt.
- Exhaustion fails closed with useful diagnostics.
- Non-transient `4xx` does not retry indefinitely.
- Same-name cleanup is exact-release only; another release remains untouched.
- Successful upload is verified by exact name on the exact release.
- SHA/release-ID checks and canonical eight-asset verification remain intact.
- Validation-only runs cannot mutate GitHub Releases.
- No Studio runtime, Firebase, Portal, version, signing, asset-name, production-SHA, or dual-platform behavior changes occur.
