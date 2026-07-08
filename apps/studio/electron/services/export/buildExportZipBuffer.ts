import { ZipFile } from "yazl";

export interface ExportZipEntry {
  fileName: string;
  pngBytes: Buffer;
}

/**
 * Builds an in-memory zip buffer from the given entries (plus an optional warnings text file),
 * using `yazl`. The renderer never touches the filesystem — this is only ever called from
 * Electron main, immediately before the save dialog writes the resulting buffer to disk.
 */
export function buildExportZipBuffer(entries: ExportZipEntry[], warningsFileContent: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zipFile = new ZipFile();

    for (const entry of entries) {
      zipFile.addBuffer(entry.pngBytes, entry.fileName);
    }

    if (warningsFileContent) {
      zipFile.addBuffer(Buffer.from(warningsFileContent, "utf-8"), "EXPORT_WARNINGS.txt");
    }

    const chunks: Buffer[] = [];
    zipFile.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zipFile.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zipFile.outputStream.on("error", (error: Error) => reject(error));

    zipFile.end();
  });
}
