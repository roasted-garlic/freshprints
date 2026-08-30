import type { ArtworkUpscalePassCount } from "../../utils/manualArtworkEnhance";

export interface EnhancePrintRequestArtworkRequest {
  printRequestId: string;
  itemId: string;
  /** Required when enhancing a catalog design — confirms catalog-wide mutation. */
  confirmCatalogEnhance?: boolean;
}

export type EnhancePrintRequestArtworkResultCode =
  | "enhanced"
  | "already_sufficient"
  | "in_progress";

export interface EnhancePrintRequestArtworkResponse {
  resultCode: EnhancePrintRequestArtworkResultCode;
  designId: string;
  widthPx: number;
  heightPx: number;
  upscalePassCount: ArtworkUpscalePassCount;
  approvedMaxPrintWidthInches: number;
  approvedMaxPrintHeightInches: number;
  message?: string;
}
