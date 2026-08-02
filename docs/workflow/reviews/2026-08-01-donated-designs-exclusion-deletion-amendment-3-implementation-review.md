# Donated Designs exclusion/deletion Amendment 3 implementation review

## Review

The implementation stays within Amendment 3: shared schema ownership manifest, trusted deletion eligibility/execution, batch consistency, tests, and durable documentation. No Whatnot source, Rules, production configuration, or unrelated behavior changed.

- Exclusion/restoration remain metadata-only and actor-independent for active staff.
- Deletion remains owner/admin only with trusted helper denial.
- Every current persisted upload-owned path is matched to the exact customer/upload canonical path.
- Unknown path fields fail closed, preventing silent orphaning after schema growth.
- Storage failures preserve the retry manifest; the document is deleted only after complete cleanup.
- Batch ZIPs and unrelated/shared objects are not deletion targets.
- Dependencies are rechecked immediately before destructive cleanup.

Focused tests, Functions build, Studio typecheck/build, lint, and diff validation passed. Manual authenticated development QA is still required.

## Verdict

**APPROVED WITH NOTE** — source is ready for development owner QA; production promotion remains blocked.
