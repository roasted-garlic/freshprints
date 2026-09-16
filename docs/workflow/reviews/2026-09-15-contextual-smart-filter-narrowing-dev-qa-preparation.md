# DEV QA preparation — Contextual Smart Filter narrowing

Owner QA result: `OWNER QA: CONTEXTUAL SMART FILTER NARROWING — PASS`.

The owner verified the following checklist:

1. Search/filter to the Highland cow example.
2. Verify initial `cow (14)` and `highland cow (12)`.
3. Select `cow`; verify results remain 14 and counts remain contextual.
4. Add `highland cow`; verify results become 12.
5. Verify `cow` count updates to 12 and `highland cow` remains 12.
6. Add another dimension; verify the result cohort narrows again and displayed counts follow it.
7. Clear/reset and verify the original cohort returns.
8. Perform a quick Portal parity check.

Expected exact query for both apps:

```ts
[["subjects:cow"], ["subjects:highland cow"]]
```

Do not enable Autonomous or mutate production for this QA. Stop at:
`OWNER QA REQUIRED — CONTEXTUAL SMART FILTER NARROWING`.
