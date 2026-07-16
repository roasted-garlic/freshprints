/** Strip a leading slash so Storage `file()` paths are object paths, not absolute FS paths. */
export function storageObjectPath(canonicalPath: string): string {
  return canonicalPath.replace(/^\//, "");
}
