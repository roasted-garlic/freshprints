import { isElectronDesktop } from "../../../shared/utils/isElectronDesktop";
import type {
  BatchDiscoveryCompleteEvent,
  BatchImportJobId,
  BatchImportProgressEvent,
  BatchJobErrorEvent,
} from "@fresh-prints/shared/types/import/batchImport.types";
import type {
  CancelBatchImportJobRequest,
  CancelBatchImportJobResult,
  FinishBatchImportJobRequest,
  FinishBatchImportJobResult,
  ImportIpcResult,
  ReadSelectedPngFileBytesResult,
  SelectImportFolderResult,
  SelectImportZipFileResult,
  SelectMultiplePngFilesResult,
  SelectSinglePngFileResult,
  SelectedPngPreviewRequest,
  StartBatchDiscoveryRequest,
  StartBatchDiscoveryResult,
  ValidateSelectedPngFileResult,
} from "@fresh-prints/shared/types/import/importIpc.types";
import type { ReadSinglePngFileBytesRequest } from "@fresh-prints/shared/types/import/readPngFileBytes.types";
function assertDesktopImportsApi() {
  if (!isElectronDesktop()) {
    throw new Error("PNG import is only available in the Fresh Prints desktop app.");
  }
}

export const importDesktopService = {
  async selectSinglePngFile(): Promise<ImportIpcResult<SelectSinglePngFileResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.selectSinglePngFile();
  },

  async validateSelectedPngFile(
    filePath: string,
  ): Promise<ImportIpcResult<ValidateSelectedPngFileResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.validateSelectedPngFile(filePath);
  },

  async clearSinglePngImportSession(): Promise<ImportIpcResult<{ cleared: boolean }>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.clearSinglePngImport();
  },

  async readSelectedPngFileBytes(
    filePathOrRequest: string | ReadSinglePngFileBytesRequest,
  ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.readSelectedPngFileBytes(filePathOrRequest);
  },

  async readSelectedPngFileBytesWithDerivatives(
    filePath: string,
  ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>> {
    return this.readSelectedPngFileBytes({ filePath, includeDerivatives: true });
  },

  async getSelectedPngPreview(request: SelectedPngPreviewRequest) {
    assertDesktopImportsApi();
    return window.freshPrints.imports.getSelectedPngPreview(request);
  },

  async readBatchValidatedPngFileBytes(
    jobId: BatchImportJobId,
    filePath: string,
    options?: { includeDerivatives?: boolean },
  ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.readSelectedPngFileBytes({
      jobId,
      filePath,
      includeDerivatives: options?.includeDerivatives === true,
    });
  },

  async readBatchValidatedPngFileBytesWithDerivatives(
    jobId: BatchImportJobId,
    filePath: string,
  ): Promise<ImportIpcResult<ReadSelectedPngFileBytesResult>> {
    return this.readBatchValidatedPngFileBytes(jobId, filePath, { includeDerivatives: true });
  },

  async finishBatchJob(
    request: FinishBatchImportJobRequest,
  ): Promise<ImportIpcResult<FinishBatchImportJobResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.finishBatchJob(request);
  },

  async selectMultiplePngFiles(): Promise<ImportIpcResult<SelectMultiplePngFilesResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.selectMultiplePngFiles();
  },

  async selectImportFolder(): Promise<ImportIpcResult<SelectImportFolderResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.selectImportFolder();
  },

  async selectImportZip(): Promise<ImportIpcResult<SelectImportZipFileResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.selectImportZip();
  },

  async startBatchDiscovery(
    request: StartBatchDiscoveryRequest,
  ): Promise<ImportIpcResult<StartBatchDiscoveryResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.startBatchDiscovery(request);
  },

  async cancelBatchJob(
    request: CancelBatchImportJobRequest,
  ): Promise<ImportIpcResult<CancelBatchImportJobResult>> {
    assertDesktopImportsApi();
    return window.freshPrints.imports.cancelBatchJob(request);
  },

  onBatchProgress(callback: (event: BatchImportProgressEvent) => void): () => void {
    assertDesktopImportsApi();
    return window.freshPrints.imports.onBatchProgress(callback);
  },

  onBatchDiscoveryComplete(callback: (event: BatchDiscoveryCompleteEvent) => void): () => void {
    assertDesktopImportsApi();
    return window.freshPrints.imports.onBatchDiscoveryComplete(callback);
  },

  onBatchJobError(callback: (event: BatchJobErrorEvent) => void): () => void {
    assertDesktopImportsApi();
    return window.freshPrints.imports.onBatchJobError(callback);
  },
};
