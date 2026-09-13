/** Short display titles that stay on one card title line. */
const STAFF_ARTWORK_TITLE_LENGTH = 10;

/**
 * Generates a compact random Staff Artwork title.
 * Does not use the source filename — long ChatGPT-style names wrap badly on cards.
 */
export function generateStaffArtworkTitle(): string {
  const entropy =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return entropy.slice(0, STAFF_ARTWORK_TITLE_LENGTH);
}
