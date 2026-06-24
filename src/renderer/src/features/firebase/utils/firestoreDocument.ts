type FirestoreDocumentValue = Record<string, unknown>;

/**
 * Firestore rejects undefined field values. Optional fields must be omitted on create,
 * or cleared with deleteField() on update.
 */
export function withoutUndefinedFields<T extends FirestoreDocumentValue>(data: T): T {
  const sanitizedEntries = Object.entries(data).filter(([, value]) => value !== undefined);

  return Object.fromEntries(sanitizedEntries) as T;
}

export function assertNoUndefinedFirestoreFields(
  data: FirestoreDocumentValue,
  context: string,
): void {
  const undefinedFields = Object.entries(data)
    .filter(([, value]) => value === undefined)
    .map(([field]) => field);

  if (undefinedFields.length > 0) {
    throw new Error(`${context} contains undefined fields: ${undefinedFields.join(", ")}`);
  }
}
