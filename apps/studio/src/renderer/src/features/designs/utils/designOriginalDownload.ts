import type { Design } from "../types/design.types";

type DesignOriginalDownloadSource = Pick<Design, "assetsPurgedAt" | "originalPath" | "title">;

/**
 * True when the design still has a Storage original staff can download.
 * Purged assets or missing path → no download.
 */
export function canDownloadDesignOriginal(design: DesignOriginalDownloadSource): boolean {
  if (design.assetsPurgedAt) {
    return false;
  }

  return Boolean(design.originalPath?.trim());
}

function extensionFromCatalogPath(catalogPath: string): string {
  const baseName = catalogPath.split("/").pop()?.trim() ?? "";
  const dotIndex = baseName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === baseName.length - 1) {
    return "";
  }

  return baseName.slice(dotIndex);
}

function sanitizeDownloadBaseName(value: string): string {
  const withoutIllegal = [...value.trim()]
    .filter((char) => {
      const code = char.charCodeAt(0);
      if (code < 32) {
        return false;
      }
      return !'<>:"/\\|?*'.includes(char);
    })
    .join("");

  const cleaned = withoutIllegal.replace(/\s+/g, " ").slice(0, 120).trim();

  return cleaned || "design";
}

/**
 * Sensible save-as name: prefer Storage original basename; fall back to sanitized title + ext.
 */
export function buildDesignOriginalDownloadFileName(design: DesignOriginalDownloadSource): string {
  const path = design.originalPath?.trim() ?? "";
  const pathBaseName = path.split("/").pop()?.trim() ?? "";

  if (pathBaseName && pathBaseName !== "." && pathBaseName !== "..") {
    return pathBaseName;
  }

  const extension = extensionFromCatalogPath(path) || ".png";
  return `${sanitizeDownloadBaseName(design.title)}${extension}`;
}
