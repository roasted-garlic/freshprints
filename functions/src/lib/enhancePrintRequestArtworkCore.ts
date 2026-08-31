import type {
  EnhancePrintRequestArtworkRequest,
  EnhancePrintRequestArtworkResponse,
} from "../../../packages/shared/src/types/printRequest/enhancePrintRequestArtwork.types";

import {
  executeSetPrintRequestItemArtworkEnhanceMode,
  type ArtworkEnhanceModeCallerContext,
} from "./setPrintRequestItemArtworkEnhanceModeCore";

function mapToggleResponseToLegacy(
  response: Awaited<ReturnType<typeof executeSetPrintRequestItemArtworkEnhanceMode>>,
): EnhancePrintRequestArtworkResponse {
  if (response.sourceType !== "catalog_design" || !response.designId) {
    throw new Error("Legacy enhance callable only supports catalog designs.");
  }

  const resultCode =
    response.resultCode === "generated_enhanced" ||
    response.resultCode === "reused_derivative" ||
    response.resultCode === "switched_enhanced"
      ? "enhanced"
      : response.resultCode === "in_progress"
        ? "in_progress"
        : "already_sufficient";

  return {
    resultCode,
    designId: response.designId,
    widthPx: response.widthPx,
    heightPx: response.heightPx,
    upscalePassCount: 0,
    approvedMaxPrintWidthInches: 0,
    approvedMaxPrintHeightInches: 0,
    message: response.message,
  };
}

export async function executeEnhancePrintRequestArtwork(
  callerUid: string,
  request: EnhancePrintRequestArtworkRequest,
): Promise<EnhancePrintRequestArtworkResponse> {
  const caller: ArtworkEnhanceModeCallerContext = { kind: "staff", callerId: callerUid };

  const response = await executeSetPrintRequestItemArtworkEnhanceMode(caller, {
    printRequestId: request.printRequestId,
    itemId: request.itemId,
    mode: "enhanced",
    confirmFirstEnhance: request.confirmCatalogEnhance === true,
  });

  return mapToggleResponseToLegacy(response);
}
