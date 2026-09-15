import {
  isStructurallyValidCatalogCopy,
  normalizeComparableTitle,
} from "./catalogTitleRules";
import {
  isCatalogTitleSource,
  type CatalogTitleSource,
} from "../../../packages/shared/src/types/design/catalogTitleSource.types";

export interface FinalCatalogCategory {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface FinalCatalogCopyResolution {
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  titleSource: "root" | "candidate" | "missing";
  descriptionSource: "root" | "candidate" | "missing";
  categorySource: "root" | "candidate" | "missing";
  /** Source to persist on the canonical root title when this resolution is written. */
  catalogTitleSource?: CatalogTitleSource;
  reasonCodes: string[];
  valid: boolean;
}

export interface FinalCatalogCopyRootInput {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  catalogTitleSource?: unknown;
  sourceStaffArtworkId?: unknown;
  sourceCustomerUploadId?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
}

const DEFAULT_IMPORT_TITLES = new Set([
  "imported design",
  "customer upload",
]);

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function filenameStem(value: unknown): string | undefined {
  const filename = asTrimmedString(value)?.split(/[\\/]/).pop();
  if (!filename) {
    return undefined;
  }
  const extensionIndex = filename.lastIndexOf(".");
  return (extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename).trim() || undefined;
}

/**
 * Import roots are seeded from a filename and are not catalog authority. Keep this deliberately
 * narrow: only exact source-stem/default matches and opaque import index/basename shapes are
 * treated as placeholders, so a genuine staff title that merely shares a word with a filename is
 * preserved.
 */
export function isImportPlaceholderTitle(
  title: unknown,
  importSourceFileName?: unknown,
  options?: { legacyFallback?: boolean },
): boolean {
  const rawTitle = asTrimmedString(title) ?? "";
  const normalizedTitle = normalizeComparableTitle(asTrimmedString(title) ?? "");
  if (!normalizedTitle) {
    return true;
  }

  if (DEFAULT_IMPORT_TITLES.has(normalizedTitle)) {
    return true;
  }

  const sourceStem = filenameStem(importSourceFileName);
  if (sourceStem && normalizedTitle === normalizeComparableTitle(sourceStem)) {
    return true;
  }

  // Legacy import batches sometimes omitted the source filename while retaining these generated
  // basenames. Require an opaque/index shape; ordinary numeric human titles remain untouched.
  if (/^[a-f0-9]{8,}$/i.test(normalizedTitle.replace(/\s+/g, ""))) {
    return true;
  }
  if (/^\d+\s*\(\d+\)$/.test(rawTitle)) {
    return true;
  }
  // Keep ordinary four-digit year-led titles (for example, "1984 Love") intact while still
  // catching short import indexes and long generated numeric basenames seen in legacy batches.
  if (options?.legacyFallback && /^(?:\d{1,3}|\d{5,12})\s+[A-Za-z]/.test(rawTitle)) {
    return true;
  }
  if (options?.legacyFallback && /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+$/.test(rawTitle)) {
    return true;
  }
  // Legacy imports without source metadata also produced short numbered labels, CamelCase
  // basenames, and mixed alphanumeric basenames. Keep these shapes bounded to the legacy path;
  // ordinary human titles with spaces remain untouched.
  if (options?.legacyFallback && /^[A-Z]{2,8}\s+\d{1,4}$/.test(rawTitle)) {
    return true;
  }
  if (options?.legacyFallback && /^[A-Z][a-z]+[A-Z][A-Za-z]+$/.test(rawTitle)) {
    return true;
  }
  if (
    options?.legacyFallback &&
    rawTitle.length >= 8 &&
    /^[A-Za-z]\d+[A-Za-z]+\d+[A-Za-z]*$/.test(rawTitle)
  ) {
    return true;
  }

  return false;
}

function isUsableCategory(
  categoryId: unknown,
  categoriesById: ReadonlyMap<string, FinalCatalogCategory>,
): FinalCatalogCategory | undefined {
  const id = asTrimmedString(categoryId);
  if (!id) {
    return undefined;
  }
  const category = categoriesById.get(id);
  if (!category || category.isActive === false) {
    return undefined;
  }
  const name = category.name.trim();
  if (!name || /^(?:un)?categorized$/i.test(name)) {
    return undefined;
  }
  return { ...category, name };
}

export function resolveFinalCatalogCopy(input: {
  root: FinalCatalogCopyRootInput;
  candidate: {
    title?: unknown;
    description?: unknown;
    categoryId?: unknown;
  };
  importSourceFileName?: unknown;
  sourceCustomerUploadId?: unknown;
  sourceStaffArtworkId?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  categories: readonly FinalCatalogCategory[];
}): FinalCatalogCopyResolution {
  const categoriesById = new Map(
    input.categories.map((category) => [category.id.trim(), category]),
  );
  const reasons: string[] = [];

  const rootTitle = asTrimmedString(input.root.title);
  const candidateTitle = asTrimmedString(input.candidate.title);
  const explicitTitleSource: CatalogTitleSource | undefined = isCatalogTitleSource(
    input.root.catalogTitleSource,
  )
    ? input.root.catalogTitleSource
    : undefined;
  const hasSourceCustomerUpload = Boolean(
    asTrimmedString(input.root.sourceCustomerUploadId ?? input.sourceCustomerUploadId),
  );
  const titleSource: CatalogTitleSource =
    explicitTitleSource ??
    (filenameStem(input.importSourceFileName) || hasSourceCustomerUpload
      ? "import_filename"
      : "legacy_unknown");
  const rootDescription = asTrimmedString(input.root.description);
  const rootCategoryId = asTrimmedString(input.root.categoryId);
  const legacyTitleFallback =
    titleSource === "legacy_unknown" ||
    (!filenameStem(input.importSourceFileName) && (!rootDescription || !rootCategoryId));
  const rootTitleIsExplicitlyTrusted =
    titleSource === "staff" || titleSource === "trusted_import" || titleSource === "ai_generated";
  // Only explicit, durable authority may protect an existing root title. Import-derived and
  // source-less legacy roots remain untrusted even when the text happens to look human; a valid
  // AI candidate must replace them. This deliberately avoids linguistic title-quality heuristics.
  const rootTitleUsable =
    Boolean(rootTitle) && isStructurallyValidCatalogCopy(rootTitle) && rootTitleIsExplicitlyTrusted;
  const title = rootTitleUsable ? rootTitle : candidateTitle;
  const resolvedTitleSource: FinalCatalogCopyResolution["titleSource"] = rootTitleUsable
    ? "root"
    : title
      ? "candidate"
      : "missing";
  const resolvedCatalogTitleSource: CatalogTitleSource | undefined = title
    ? rootTitleUsable
      ? titleSource
      : "ai_generated"
    : undefined;
  if (!title) {
    reasons.push(rootTitle ? "catalog_copy_title_untrusted" : "catalog_copy_title_missing");
  } else if (!isStructurallyValidCatalogCopy(title)) {
    reasons.push("catalog_copy_title_invalid");
  } else if (
    !rootTitleUsable &&
    isImportPlaceholderTitle(title, input.importSourceFileName, {
      legacyFallback: legacyTitleFallback,
    })
  ) {
    reasons.push("catalog_copy_title_placeholder");
  }

  const candidateDescription = asTrimmedString(input.candidate.description);
  const rootDescriptionUsable =
    Boolean(rootDescription) && isStructurallyValidCatalogCopy(rootDescription);
  const description = rootDescriptionUsable ? rootDescription : candidateDescription;
  const descriptionSource: FinalCatalogCopyResolution["descriptionSource"] =
    rootDescriptionUsable
      ? "root"
      : description
        ? "candidate"
        : "missing";
  if (!description || !isStructurallyValidCatalogCopy(description)) {
    reasons.push(
      rootDescription ? "catalog_copy_description_invalid" : "catalog_copy_description_missing",
    );
  }

  const rootCategory = isUsableCategory(input.root.categoryId, categoriesById);
  const candidateCategory = isUsableCategory(input.candidate.categoryId, categoriesById);
  const category = rootCategory ?? candidateCategory;
  const categorySource: FinalCatalogCopyResolution["categorySource"] = rootCategory
    ? "root"
    : category
      ? "candidate"
      : "missing";
  if (!category) {
    reasons.push("catalog_copy_category_unresolved");
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(category ? { categoryId: category.id, categoryName: category.name } : {}),
    titleSource: resolvedTitleSource,
    ...(resolvedCatalogTitleSource
      ? { catalogTitleSource: resolvedCatalogTitleSource }
      : {}),
    descriptionSource,
    categorySource,
    reasonCodes: [...new Set(reasons)],
    valid: reasons.length === 0,
  };
}
