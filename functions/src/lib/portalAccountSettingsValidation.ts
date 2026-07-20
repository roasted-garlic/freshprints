const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePortalAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidPortalAccountEmail(email: string): boolean {
  return emailPattern.test(normalizePortalAccountEmail(email));
}

export function validateDeletionConfirmation(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error('Type DELETE to confirm you want to request account deletion.');
  }

  const confirmation = value.trim().toUpperCase();
  if (confirmation !== "DELETE") {
    throw new Error('Type DELETE to confirm you want to request account deletion.');
  }

  return confirmation;
}
