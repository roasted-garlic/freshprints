import type { CatalogTagInput } from "../types/catalogTag.types";
import { normalizeCatalogTagInput } from "./catalogTagNormalizer";

export interface BulkCatalogTagImportItem {
  name: string;
  aliases: string[];
  preferredWhen: string;
}

export interface BulkCatalogTagImportRejectedItem {
  index: number;
  name?: string;
  reason: string;
}

export interface BulkCatalogTagImportValidationResult {
  accepted: BulkCatalogTagImportItem[];
  rejected: BulkCatalogTagImportRejectedItem[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatEntryLabel(index: number): string {
  return `Entry ${index + 1}`;
}

function readAliases(value: unknown, entryLabel: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${entryLabel} aliases must be an array of strings.`);
  }

  return value.map((alias, aliasIndex) => {
    if (typeof alias !== "string") {
      throw new Error(`${entryLabel} alias ${aliasIndex + 1} must be a string.`);
    }

    return alias;
  });
}

function readEntryName(entry: unknown): string | undefined {
  if (!isPlainObject(entry) || typeof entry.name !== "string") {
    return undefined;
  }

  return entry.name.trim() || undefined;
}

function readBulkCatalogTagEntry(entry: unknown, index: number): BulkCatalogTagImportItem {
  const entryLabel = formatEntryLabel(index);

  if (!isPlainObject(entry)) {
    throw new Error(`${entryLabel} must be an object with name, aliases, and preferredWhen fields.`);
  }

  const unsupportedKeys = Object.keys(entry).filter(
    (key) => key !== "name" && key !== "aliases" && key !== "preferredWhen",
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `${entryLabel} contains unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.join(", ")}.`,
    );
  }

  if (typeof entry.name !== "string") {
    throw new Error(`${entryLabel} must include a string name.`);
  }

  if (typeof entry.preferredWhen !== "string") {
    throw new Error(`${entryLabel} must include a string preferredWhen.`);
  }

  return normalizeCatalogTagInput({
    name: entry.name,
    aliases: readAliases(entry.aliases, entryLabel),
    preferredWhen: entry.preferredWhen,
  } satisfies CatalogTagInput);
}

function rejectPayloadCollisions(
  candidates: Array<{ index: number; item: BulkCatalogTagImportItem }>,
): BulkCatalogTagImportValidationResult {
  const accepted: BulkCatalogTagImportItem[] = [];
  const rejected: BulkCatalogTagImportRejectedItem[] = [];
  const seenValues = new Map<string, { index: number; name: string }>();

  for (const candidate of candidates) {
    const { item } = candidate;
    const values = [item.name, ...item.aliases];
    const collision = values
      .map((value) => ({ previous: seenValues.get(value), value }))
      .find((entry): entry is { previous: { index: number; name: string }; value: string } =>
        entry.previous !== undefined,
      );

    if (collision) {
      rejected.push({
        index: candidate.index,
        name: item.name,
        reason: `"${collision.value}" duplicates ${collision.previous.name} from entry ${collision.previous.index + 1}.`,
      });
      continue;
    }

    for (const value of values) {
      seenValues.set(value, { index: candidate.index, name: item.name });
    }

    accepted.push(item);
  }

  return { accepted, rejected };
}

function parseBulkCatalogTagJsonRoot(input: string): unknown[] {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Paste tag JSON to preview or import.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(trimmedInput);
  } catch {
    throw new Error("Tag import JSON is invalid.");
  }

  if (!Array.isArray(parsedJson)) {
    throw new Error("Tag import JSON must be an array.");
  }

  if (parsedJson.length === 0) {
    throw new Error("Tag import JSON must contain at least one tag.");
  }

  return parsedJson;
}

export function validateBulkCatalogTagJson(input: string): BulkCatalogTagImportValidationResult {
  const parsedJson = parseBulkCatalogTagJsonRoot(input);
  const candidates: Array<{ index: number; item: BulkCatalogTagImportItem }> = [];
  const rejected: BulkCatalogTagImportRejectedItem[] = [];

  parsedJson.forEach((entry, index) => {
    try {
      candidates.push({
        index,
        item: readBulkCatalogTagEntry(entry, index),
      });
    } catch (error) {
      rejected.push({
        index,
        name: readEntryName(entry),
        reason: error instanceof Error ? error.message : `${formatEntryLabel(index)} is invalid.`,
      });
    }
  });

  const collisionResult = rejectPayloadCollisions(candidates);

  return {
    accepted: collisionResult.accepted,
    rejected: [...rejected, ...collisionResult.rejected].sort((left, right) => left.index - right.index),
  };
}

export function parseBulkCatalogTagJson(input: string): BulkCatalogTagImportItem[] {
  const result = validateBulkCatalogTagJson(input);

  if (result.rejected.length > 0) {
    const firstRejected = result.rejected[0];

    throw new Error(
      `${result.rejected.length} tag entr${result.rejected.length === 1 ? "y was" : "ies were"} rejected. Entry ${firstRejected.index + 1}: ${firstRejected.reason}`,
    );
  }

  return result.accepted;
}
