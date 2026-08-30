type FirestoreDocumentValue = Record<string, unknown>;

/** Firestore rejects undefined field values; omit optional fields instead. */
export function withoutUndefinedFields<T extends FirestoreDocumentValue>(data: T): T {
  const sanitizedEntries = Object.entries(data).filter(([, value]) => value !== undefined);

  return Object.fromEntries(sanitizedEntries) as T;
}

/**
 * Deep omit of `undefined` for nested maps/arrays before Firestore writes.
 * Matches Functions AI pipeline persistence convention (omit absent optionals; never write undefined).
 */
export function withoutUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => withoutUndefinedDeep(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, withoutUndefinedDeep(entryValue)]),
  ) as T;
}
