# Independent Implementation Review: Portal design issue reporting

Date: 2026-08-01  
Verdict: **APPROVED WITH NOTES — ready for development deployment approval**

## Independent findings

- Portal preserves Component → Hook → Service → callable. The ID displayed/submitted comes from the selected catalog model; the backend still treats it as untrusted and rereads the authoritative ready design.
- Submission derives UID/customer/snapshots/status/timestamps server-side. Transactional intent, open guard, and daily quota documents prevent replay, same-design open duplicates, and quota races without history scans.
- Resolution independently loads active staff and accepts only owner/admin/helper, updates only the report, deletes only its uniqueness guard, is retry-safe, and has no design write.
- Rules expose report reads only to active staff and deny all client writes; abuse-control collections deny all access.
- Studio adds one provider-scoped `status==open`, createdAt-desc, limit-100 listener with trace attach/emission/unsubscribe. Cards use snapshots and add no customer/design listener. Resolved history is an explicit limit-50 read.
- Existing `portal_queued` and `show_queue_full` derivation/acknowledgment remains intact. Report resolution is not stored as a per-user acknowledgment.
- Studio design navigation validates the parameter and performs a cached one-shot service read. Missing designs surface safe copy.
- Portal modal has read-only ID, 1,000-character input cap, server/client 10-character minimum, in-flight lock, success state, Escape/no-write behavior, focus containment and trigger restoration, and no native dialogs.

## Notes

- Version 1 resolved history currently loads the newest bounded page of 50 on demand. Additional cursor pagination can be added if production volume ever exceeds the initial page; no unbounded fallback exists.
- Automated tests validate security and cross-layer contracts, while signed-in customer/staff interaction, guest return behavior, visual mobile layout, live badge arrival, and role switching remain required development owner QA after deployment.
- App Check was intentionally not introduced, matching approved decision 14.

No blocking security, transaction, listener, Rules, index, or design-integrity finding remains.
