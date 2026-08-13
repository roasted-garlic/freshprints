import { dialog } from "electron";

import { MAX_BATCH_FILES } from "@fresh-prints/shared/constants/import/batchImportLimits.constants";
import type { SelectMultiplePngFilesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { getActiveBrowserWindow } from "./importBrowserWindow";
import { registerBatchImportSelection } from "./importBatchSession";
import { buildSelectedPngFile } from "./selectedPngFileBuilder";
import {
  isDerivativeLocusDiagEnabled,
  logDerivativeLocusDiag,
} from "../../services/import/derivativeLocusDiagnostic";

/**
 * Diagnostic packaged/local builds only: FP_DIAG_IMPORT_PATHS=path1|path2 skips the OS file dialog
 * but still uses the same registerBatchImportSelection → discovery → upload chain.
 */
function resolveDiagnosticImportPaths(): string[] | null {
  if (!isDerivativeLocusDiagEnabled()) {
    return null;
  }

  const raw = process.env.FP_DIAG_IMPORT_PATHS?.trim();
  if (!raw) {
    return null;
  }

  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export async function selectMultiplePngFiles(
  webContentsId: number,
): Promise<SelectMultiplePngFilesResult> {
  const diagnosticPaths = resolveDiagnosticImportPaths();
  let filePaths: string[];

  if (diagnosticPaths) {
    logDerivativeLocusDiag({
      stage: "ui.select_multiple.diagnostic_paths",
      ok: true,
      detail: { count: diagnosticPaths.length, dialogBypassed: true },
    });
    filePaths = diagnosticPaths;
  } else {
    const browserWindow = getActiveBrowserWindow();

    const dialogOptions = {
      properties: ["openFile", "multiSelections"] as Array<"openFile" | "multiSelections">,
      title: "Select PNG files",
      filters: [{ name: "PNG Images", extensions: ["png"] }],
    };

    const dialogResult = browserWindow
      ? await dialog.showOpenDialog(browserWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { canceled: true };
    }

    filePaths = dialogResult.filePaths;
    logDerivativeLocusDiag({
      stage: "ui.select_multiple.dialog",
      ok: true,
      detail: { count: filePaths.length, dialogBypassed: false },
    });
  }

  if (filePaths.length > MAX_BATCH_FILES) {
    throw new Error(
      `You can select up to ${MAX_BATCH_FILES} PNG files per batch. Reduce your selection and try again.`,
    );
  }

  const files = await Promise.all(
    filePaths.map(async (selectedPath) => {
      if (!selectedPath) {
        throw new Error("A selected file path was missing.");
      }

      return buildSelectedPngFile(selectedPath);
    }),
  );

  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "multiple-png",
    filePaths: files.map((file) => file.filePath),
  });

  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "multiple-png",
    fileCount: files.length,
    fileNames: files.map((file) => file.fileName),
  };
}
