import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import yauzl from "yauzl";

import {
  CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  CUSTOMER_UPLOAD_MAX_NESTED_ZIP_DEPTH,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSION_RATIO,
  CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";

export interface SafeZipImageEntry {
  entryName: string;
  displayFilename: string;
  bytes: Buffer;
  compressedSize: number;
  uncompressedSize: number;
}

export type ZipExtractFailureCode =
  | "archive_exceeds_limits"
  | "nested_archive_rejected"
  | "processing_failed";

export class CustomerUploadZipError extends Error {
  readonly code: ZipExtractFailureCode;

  constructor(message: string, code: ZipExtractFailureCode) {
    super(message);
    this.name = "CustomerUploadZipError";
    this.code = code;
  }
}

/**
 * Rejects traversal, absolute paths, drive letters, and empty/dangerous segments.
 */
export function isSafeZipEntryName(entryName: string): boolean {
  if (!entryName || entryName.includes("\0")) {
    return false;
  }

  const normalized = entryName.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.startsWith("//")) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(normalized)) {
    return false;
  }
  if (normalized.includes("://")) {
    return false;
  }

  const parts = normalized.split("/");
  for (const part of parts) {
    if (part === ".." || part === ".") {
      return false;
    }
  }

  return true;
}

export function isNestedZipEntryName(entryName: string): boolean {
  const lower = entryName.replace(/\\/g, "/").toLowerCase();
  return lower.endsWith(".zip");
}

export function isCandidateImageEntryName(entryName: string): boolean {
  const lower = entryName.replace(/\\/g, "/").toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".webp");
}

export function deterministicZipUploadId(batchId: string, entryName: string): string {
  return createHash("sha256").update(`${batchId}\0${entryName}`).digest("hex").slice(0, 20);
}

function openZipFromBuffer(buffer: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error("Unable to open ZIP archive."));
        return;
      }
      resolve(zipFile);
    });
  });
}

/**
 * Streams a ZIP buffer, validates safety limits, and returns accepted image entry bytes.
 * @param maxDecompressedBytes Purpose-scoped cap (defaults to absolute ceiling).
 */
export async function extractSafeCustomerUploadImagesFromZip(
  zipBytes: Buffer,
  maxDecompressedBytes: number = CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES,
): Promise<{ images: SafeZipImageEntry[]; scannedEntries: number }> {
  if (CUSTOMER_UPLOAD_MAX_NESTED_ZIP_DEPTH !== 0) {
    throw new Error("Nested ZIP depth must be 0 for customer uploads.");
  }

  const safeMaxDecompressed =
    Number.isFinite(maxDecompressedBytes) && maxDecompressedBytes > 0
      ? Math.floor(maxDecompressedBytes)
      : CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES;

  const zipFile = await openZipFromBuffer(zipBytes);
  const images: SafeZipImageEntry[] = [];
  const seenNames = new Set<string>();
  let scannedEntries = 0;
  let decompressedTotal = 0;
  let tempDir: string | null = null;

  try {
    tempDir = await mkdtemp(path.join(tmpdir(), "fp-customer-zip-"));

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const settleOk = (): void => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const settleErr = (error: unknown): void => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      const fail = (message: string, code: ZipExtractFailureCode): void => {
        settleErr(new CustomerUploadZipError(message, code));
      };

      zipFile.on("error", settleErr);
      zipFile.on("end", settleOk);

      zipFile.on("entry", (entry: yauzl.Entry) => {
        void (async () => {
          try {
            if (settled) {
              return;
            }

            scannedEntries += 1;
            if (scannedEntries > CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES) {
              fail("ZIP has too many entries.", "archive_exceeds_limits");
              return;
            }

            const entryName = entry.fileName;
            if (/\/$/.test(entryName)) {
              zipFile.readEntry();
              return;
            }

            if (!isSafeZipEntryName(entryName)) {
              fail("ZIP contains an unsafe path.", "archive_exceeds_limits");
              return;
            }

            const normalized = entryName.replace(/\\/g, "/");
            if (seenNames.has(normalized)) {
              fail("ZIP contains duplicate paths.", "archive_exceeds_limits");
              return;
            }
            seenNames.add(normalized);

            if (isNestedZipEntryName(entryName)) {
              fail("Nested ZIP archives are not allowed.", "nested_archive_rejected");
              return;
            }

            // Skip non-image files (macosx metadata, etc.) without failing the archive.
            if (!isCandidateImageEntryName(entryName)) {
              zipFile.readEntry();
              return;
            }

            if (images.length >= CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH) {
              fail("ZIP contains too many images.", "archive_exceeds_limits");
              return;
            }

            const compressed = entry.compressedSize ?? 0;
            const uncompressed = entry.uncompressedSize ?? 0;
            if (uncompressed <= 0 || uncompressed > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
              fail("ZIP entry exceeds size limits.", "archive_exceeds_limits");
              return;
            }

            if (compressed > 0) {
              const ratio = uncompressed / compressed;
              if (ratio > CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSION_RATIO) {
                fail("ZIP compression ratio is too high.", "archive_exceeds_limits");
                return;
              }
            }

            decompressedTotal += uncompressed;
            if (decompressedTotal > safeMaxDecompressed) {
              fail("ZIP decompressed size exceeds the limit.", "archive_exceeds_limits");
              return;
            }

            const bytes = await readZipEntryBytes(zipFile, entry, tempDir!);
            if (settled) {
              return;
            }

            const displayFilename = normalized.split("/").pop() ?? "image";

            images.push({
              entryName: normalized,
              displayFilename,
              bytes,
              compressedSize: compressed,
              uncompressedSize: uncompressed,
            });

            zipFile.readEntry();
          } catch (error) {
            settleErr(
              error instanceof CustomerUploadZipError
                ? error
                : new CustomerUploadZipError(
                    error instanceof Error ? error.message : "ZIP processing failed.",
                    "processing_failed",
                  ),
            );
          }
        })();
      });

      zipFile.readEntry();
    });

    return { images, scannedEntries };
  } finally {
    zipFile.close();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function readZipEntryBytes(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
  tempDir: string,
): Promise<Buffer> {
  const openReadStream = (): Promise<NodeJS.ReadableStream> =>
    new Promise((resolve, reject) => {
      zipFile.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          reject(error ?? new Error("Unable to read ZIP entry."));
          return;
        }
        resolve(stream);
      });
    });

  const stream = await openReadStream();
  const tempFile = path.join(tempDir, `${Date.now()}-${Math.random().toString(16).slice(2)}.bin`);
  await pipeline(stream, createWriteStream(tempFile));
  const bytes = await readFile(tempFile);
  if (bytes.byteLength > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
    throw new CustomerUploadZipError(
      "Extracted file exceeds size limits.",
      "archive_exceeds_limits",
    );
  }
  return bytes;
}

export function zipFailureCode(error: unknown): ZipExtractFailureCode {
  if (error instanceof CustomerUploadZipError) {
    return error.code;
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "nested_archive_rejected" || code === "archive_exceeds_limits") {
      return code;
    }
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (
    /unsafe path|duplicate paths|too many entries|too many images|size limits|compression ratio|decompressed size|invalid relative path/i.test(
      message,
    )
  ) {
    return "archive_exceeds_limits";
  }
  if (/nested zip/i.test(message)) {
    return "nested_archive_rejected";
  }
  return "processing_failed";
}
