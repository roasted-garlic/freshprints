const ALLOWED_DOWNLOAD_URL_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

export function isAllowedFirebaseStorageDownloadUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return false;
    }
    if (ALLOWED_DOWNLOAD_URL_HOSTS.has(parsed.host)) {
      return true;
    }
    // Newer Firebase Storage hostnames: <bucket>.firebasestorage.app
    return parsed.host.endsWith(".firebasestorage.app");
  } catch {
    return false;
  }
}
