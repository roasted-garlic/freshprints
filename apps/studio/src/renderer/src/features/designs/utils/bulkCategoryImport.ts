export interface BulkCategoryImportItem {
  name: string;
  description: string;
}

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatEntryLabel(index: number): string {
  return `Entry ${index + 1}`;
}

export function parseBulkCategoryJson(input: string): BulkCategoryImportItem[] {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Paste category JSON to preview or import.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(trimmedInput);
  } catch {
    throw new Error("Category import JSON is invalid.");
  }

  if (!Array.isArray(parsedJson)) {
    throw new Error("Category import JSON must be an array.");
  }

  if (parsedJson.length === 0) {
    throw new Error("Category import JSON must contain at least one category.");
  }

  const seenNames = new Set<string>();

  return parsedJson.map((entry, index) => {
    const entryLabel = formatEntryLabel(index);

    if (!isPlainObject(entry)) {
      throw new Error(`${entryLabel} must be an object with name and description fields.`);
    }

    const keys = Object.keys(entry);
    const unsupportedKeys = keys.filter((key) => key !== "name" && key !== "description");

    if (unsupportedKeys.length > 0) {
      throw new Error(
        `${entryLabel} contains unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.join(", ")}.`,
      );
    }

    if (typeof entry.name !== "string" || !entry.name.trim()) {
      throw new Error(`${entryLabel} must include a non-empty string name.`);
    }

    if (typeof entry.description !== "string" || !entry.description.trim()) {
      throw new Error(`${entryLabel} must include a non-empty string description.`);
    }

    const normalizedName = normalizeCategoryName(entry.name);

    if (seenNames.has(normalizedName)) {
      throw new Error(`${entryLabel} duplicates another pasted category name: ${entry.name.trim()}.`);
    }

    seenNames.add(normalizedName);

    return {
      name: entry.name.trim(),
      description: entry.description.trim(),
    };
  });
}
