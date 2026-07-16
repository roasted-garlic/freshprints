type FirestoreDocumentValue = Record<string, unknown>;

/** Firestore rejects undefined field values; omit optional fields instead. */
export function withoutUndefinedFields<T extends FirestoreDocumentValue>(data: T): T {
  const sanitizedEntries = Object.entries(data).filter(([, value]) => value !== undefined);

  return Object.fromEntries(sanitizedEntries) as T;
}
