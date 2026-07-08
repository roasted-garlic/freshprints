export function importDesignTitleFromFileName(fileName: string): string {
  const trimmedFileName = fileName.trim();

  if (!trimmedFileName) {
    return "Imported design";
  }

  const extensionIndex = trimmedFileName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return trimmedFileName;
  }

  return trimmedFileName.slice(0, extensionIndex);
}
