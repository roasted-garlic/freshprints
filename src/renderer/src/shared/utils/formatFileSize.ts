const FILE_SIZE_UNITS = ["KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }

  if (bytes === 0) {
    return "0 KB";
  }

  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
