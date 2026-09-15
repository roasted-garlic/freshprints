/**
 * Provenance for the canonical catalog title on a design.
 *
 * This is intentionally optional so legacy design records remain readable.  Values written by
 * the AI pipeline are server-owned; client metadata edits may only stamp `staff`.
 */
export type CatalogTitleSource =
  | "staff"
  | "trusted_import"
  | "import_filename"
  | "ai_generated"
  | "legacy_unknown";

export const CATALOG_TITLE_SOURCES: readonly CatalogTitleSource[] = [
  "staff",
  "trusted_import",
  "import_filename",
  "ai_generated",
  "legacy_unknown",
] as const;

export function isCatalogTitleSource(value: unknown): value is CatalogTitleSource {
  return (
    typeof value === "string" &&
    (CATALOG_TITLE_SOURCES as readonly string[]).includes(value)
  );
}
