import type { ArtworkEnhanceMode } from "../../utils/interactiveArtworkEnhance";
import type { PrintRequestItemSourceType } from "./printRequest.types";

export interface SetPrintRequestItemArtworkEnhanceModeRequest {
  printRequestId: string;
  itemId: string;
  mode: ArtworkEnhanceMode;
  /** Required on first interactive generation for legacy staff catalog enhance flows. */
  confirmFirstEnhance?: boolean;
}

export type SetPrintRequestItemArtworkEnhanceModeResultCode =
  | "switched_baseline"
  | "switched_enhanced"
  | "generated_enhanced"
  | "reused_derivative"
  | "in_progress";

export interface SetPrintRequestItemArtworkEnhanceModeResponse {
  resultCode: SetPrintRequestItemArtworkEnhanceModeResultCode;
  printRequestId: string;
  itemId: string;
  sourceType: PrintRequestItemSourceType;
  designId?: string;
  customerUploadId?: string;
  artworkEnhanceMode: ArtworkEnhanceMode;
  widthPx: number;
  heightPx: number;
  printWidthInches?: number;
  printHeightInches?: number;
  message?: string;
}
