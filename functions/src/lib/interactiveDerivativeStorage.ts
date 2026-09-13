import { storageObjectPath } from "./storageObjectPath";
import { adminStorage } from "./admin";

/** Returns whether the canonical Storage object exists for an interactive or baseline production path. */
export async function canonicalStorageObjectExists(canonicalPath: string): Promise<boolean> {
  const trimmed = canonicalPath.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const [exists] = await adminStorage.bucket().file(storageObjectPath(trimmed)).exists();
    return exists;
  } catch {
    return false;
  }
}
