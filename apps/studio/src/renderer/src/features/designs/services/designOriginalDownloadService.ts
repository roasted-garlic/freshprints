import { desktopAppService } from "../../../shared/services/desktopAppService";
import type { Design } from "../types/design.types";
import {
  buildDesignOriginalDownloadFileName,
  canDownloadDesignOriginal,
} from "../utils/designOriginalDownload";
import { designDerivativeUrlService } from "./designDerivativeUrlService";

type DesignOriginalDownloadSource = Pick<
  Design,
  "assetsPurgedAt" | "originalPath" | "title"
>;

/**
 * Resolves the full-res Storage original and saves via Electron (or opens URL outside Electron).
 */
export async function downloadDesignOriginal(
  design: DesignOriginalDownloadSource,
): Promise<"saved" | "canceled"> {
  if (!canDownloadDesignOriginal(design)) {
    throw new Error(
      design.assetsPurgedAt
        ? "Large images were deleted for this design."
        : "This design has no original image to download.",
    );
  }

  const downloadUrl = await designDerivativeUrlService.getDownloadUrlForCatalogPath(
    design.originalPath,
  );

  if (!downloadUrl) {
    throw new Error("Unable to resolve the original image for download.");
  }

  return desktopAppService.downloadUrlToFile(
    downloadUrl,
    buildDesignOriginalDownloadFileName(design),
  );
}
