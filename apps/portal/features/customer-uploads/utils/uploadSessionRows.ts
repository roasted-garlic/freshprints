export function buildPersistedUploadSessionIds(
  rows: Array<{ uploadId?: string | null }>,
): string[] {
  return rows.flatMap((row) => (row.uploadId ? [row.uploadId] : []));
}
