import { importDesktopService } from "../services/importDesktopService";

/**
 * Releases the main-process single-file import session lock.
 * Safe to call when no session is active.
 */
export async function releaseSinglePngImportSession(): Promise<void> {
  const result = await importDesktopService.clearSinglePngImportSession();

  if (!result.success) {
    console.error("Failed to clear single PNG import session:", result.error.message);
  }
}
