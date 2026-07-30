export class ProductionDiagnosticWarningDeduper {
  private readonly keys = new Set<string>();

  shouldEmit(
    documentPath: string,
    missingFields: readonly string[],
    legacyExtraFields: readonly string[],
  ): boolean {
    const key = `${documentPath}|missing:${[...missingFields].sort().join(",")}|legacy:${[
      ...legacyExtraFields,
    ].sort().join(",")}`;
    if (this.keys.has(key)) return false;
    if (this.keys.size >= 500) this.keys.clear();
    this.keys.add(key);
    return true;
  }
}
