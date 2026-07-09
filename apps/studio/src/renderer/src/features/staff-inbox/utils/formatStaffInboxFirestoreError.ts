export function formatStaffInboxFirestoreError(message: string): string {
  if (/index/i.test(message)) {
    return "Firestore indexes are still building. Open items may be incomplete until indexing finishes.";
  }

  const firstLine = message.split("\n")[0]?.trim();
  return firstLine || "Unable to load inbox activity.";
}
