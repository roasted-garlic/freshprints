/** Firestore collection for resumable account merge jobs (Admin SDK writes only). */
export const CUSTOMER_MERGE_JOBS_COLLECTION = "customerMergeJobs" as const;

/** Ordered merge job stages — must match `CustomerAccountMergeStage` in shared types. */
export const CUSTOMER_ACCOUNT_MERGE_STAGES = [
  "validate_preview",
  "acquire_locks",
  "username_reservation",
  "cleanup_empty_print_requests",
  "reassign_print_requests",
  "reassign_show_allocations",
  "reassign_uploads_metadata",
  "migrate_upload_storage",
  "reassign_assisted_creation",
  "migrate_assisted_storage",
  "reassign_misc_collections",
  "move_favorites",
  "invalidate_web_push",
  "finalize_survivor_counters",
  "tombstone_source_customer",
  "tombstone_source_user",
  "disable_source_auth",
  "propagate_identity_snapshots",
  "release_locks",
] as const;
