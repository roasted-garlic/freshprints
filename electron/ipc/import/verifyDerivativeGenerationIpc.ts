import { ipcMain } from "electron";

import type { DerivativeGenerationVerificationResult } from "@fresh-prints/shared/types/import/derivativeGeneration.types";
import { verifyDerivativeGenerationInMainProcess } from "../../services/import/verifyDerivativeGenerationInMainProcess";
import { IMPORT_VERIFY_DERIVATIVE_GENERATION } from "./importIpcChannels";
import { importIpcFailure, importIpcSuccess } from "./importIpcResponse";

export function registerDevDerivativeVerificationIpc(): void {
  ipcMain.handle(IMPORT_VERIFY_DERIVATIVE_GENERATION, async () => {
    try {
      const result: DerivativeGenerationVerificationResult =
        await verifyDerivativeGenerationInMainProcess();

      if (!result.sharpLoadOk) {
        return importIpcFailure("INTERNAL_ERROR", result.details.join(" "));
      }

      return importIpcSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Derivative generation verification failed unexpectedly.";

      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });
}
