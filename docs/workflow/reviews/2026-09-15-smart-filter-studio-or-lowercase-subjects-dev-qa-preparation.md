# DEV QA preparation — Smart Filter same-dimension OR + lowercase Subjects

Environment: `fresh-prints-dev` only. No production deploy, setting change, data repair, or
Algolia mutation is authorized by this phase.

## Owner checklist

1. Search `highland` and note the displayed result count.
2. Open Smart Filters → Subjects.
3. Select `cow`, then add `highland cow`.
4. Confirm the combined result is OR-within-Subjects (it must not collapse to only designs that
   carry both tokens).
5. Add a value in another dimension and confirm that dimension ANDs with the Subject group.
6. Confirm category, text search, Halftone, Needs Companion, pagination, and clear/reset retain
   their existing behavior.
7. Confirm Subject labels are lowercase and case variants do not appear as separate choices.
8. Perform a quick Portal parity check; owner reports Portal already filters correctly.

## Expected implementation behavior

For Subjects `cow` + `highland cow`, the request must be:

```text
[["subjects:cow", "subjects:highland cow"]]
```

With Styles selected as well, the outer shape is AND across dimensions. No broad text-search or
client-side Smart Filter workaround is used. Smart + Halftone stays managed-search plus the staff
Halftone post-filter; exact-ID fallback fails closed when Smart Filters are active.

## Data caveat

The current deployed DEV Functions and index predate lowercase canonicalization. The local source
and tests prove future writes and query inputs; they do not prove historical DEV index convergence.
That separate owner-gated deployment/repair/reindex checkpoint must be completed before declaring
the lowercase inventory clean.

