import { createWriteStream } from "node:fs";
import { mkdir, open, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

import { ALLOWED_EXTENSIONS } from "../../../shared/constants/importValidation.constants";
import {
  MAX_BATCH_FILES,
  MAX_EXTRACTED_BYTES,
  MAX_NESTED_ZIP_DEPTH,
  MAX_ZIP_COMPRESSION_RATIO,
  MAX_ZIP_ENTRIES,
  MAX_ZIP_SIZE_BYTES,
} from "../../../shared/constants/import/batchImportLimits.constants";
import {
  formatZipExtractedSizeLimitExceededMessage,
  formatZipSizeLimitExceededMessage,
} from "../../../shared/utils/importLimitMessages";
import {
  isZipDirectoryEntry,
  resolveSafeZipEntryPath,
  toZipRelativePath,
} from "./zipEntryPathSafety";
import { ZipExtractionError } from "./zipExtractionErrors";

const ZIP_LOCAL_FILE_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ZIP_EMPTY_ARCHIVE_HEADER = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const ZIP_SPANNED_ARCHIVE_HEADER = Buffer.from([0x50, 0x4b, 0x07, 0x08]);

export interface ZipExtractedCandidate {
  absolutePath: string;
  fileName: string;
  relativePath: string;
}

export interface ZipExtractionResult {
  candidates: ZipExtractedCandidate[];
  entriesScanned: number;
  nestedZipsNotOpened: number;
  pngsDiscovered: number;
  truncated: boolean;
}

export interface ZipExtractionOptions {
  extractRoot: string;
  maxCandidates?: number;
  maxNestedZipDepth?: number;
  nestedZipDepth?: number;
  onProgress?: (progress: { entriesScanned: number; pngsDiscovered: number }) => void;
  pathPrefix?: string;
  sharedExtractedBytes?: { value: number };
  shouldCancel: () => boolean;
  zipPath: string;
}

function hasPngExtension(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}

function hasZipExtension(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".zip";
}

function isZipSymlinkEntry(entry: yauzl.Entry): boolean {
  if (entry.externalFileAttributes === undefined) {
    return false;
  }

  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (mode & 0o170000) === 0o120000;
}

function openZipFile(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error("The ZIP archive could not be opened."));
        return;
      }

      resolve(zipFile);
    });
  });
}

function readZipEntryStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, readStream) => {
      if (error || !readStream) {
        reject(error ?? new Error("The ZIP entry could not be read."));
        return;
      }

      resolve(readStream);
    });
  });
}

async function assertZipArchiveMagicBytes(zipPath: string): Promise<void> {
  const fileHandle = await open(zipPath, "r");

  try {
    const header = Buffer.alloc(4);
    await fileHandle.read(header, 0, 4, 0);

    const isRecognizedHeader =
      header.equals(ZIP_LOCAL_FILE_HEADER) ||
      header.equals(ZIP_EMPTY_ARCHIVE_HEADER) ||
      header.equals(ZIP_SPANNED_ARCHIVE_HEADER);

    if (!isRecognizedHeader) {
      throw new ZipExtractionError(
        "ZIP_INVALID_ARCHIVE",
        "The selected file does not appear to be a valid ZIP archive.",
      );
    }
  } finally {
    await fileHandle.close();
  }
}

async function assertZipArchiveSize(zipPath: string): Promise<number> {
  const zipStats = await stat(zipPath);

  if (!zipStats.isFile()) {
    throw new ZipExtractionError("ZIP_INVALID_ARCHIVE", "The selected ZIP path is not a file.");
  }

  if (zipStats.size > MAX_ZIP_SIZE_BYTES) {
    throw new ZipExtractionError(
      "FILE_TOO_LARGE",
      formatZipSizeLimitExceededMessage(),
    );
  }

  return zipStats.size;
}

function assertCompressionRatio(entry: yauzl.Entry): void {
  const compressedSize = entry.compressedSize;
  const uncompressedSize = entry.uncompressedSize;

  if (compressedSize === 0) {
    return;
  }

  if (uncompressedSize / compressedSize > MAX_ZIP_COMPRESSION_RATIO) {
    throw new ZipExtractionError(
      "ZIP_COMPRESSION_RATIO_EXCEEDED",
      "The ZIP archive exceeds the allowed compression ratio and cannot be extracted safely.",
    );
  }
}

function assertExtractedByteBudget(currentExtractedBytes: number, entry: yauzl.Entry): void {
  const nextExtractedBytes = currentExtractedBytes + entry.uncompressedSize;

  if (nextExtractedBytes > MAX_EXTRACTED_BYTES) {
    throw new ZipExtractionError(
      "ZIP_EXTRACTED_SIZE_EXCEEDED",
      formatZipExtractedSizeLimitExceededMessage(),
    );
  }
}

async function writeZipEntryToDisk(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
  targetPath: string,
): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });

  const readStream = await readZipEntryStream(zipFile, entry);
  const writeStream = createWriteStream(targetPath);

  await pipeline(readStream, writeStream);
}

function mapYauzlError(error: unknown): ZipExtractionError {
  if (error instanceof ZipExtractionError) {
    return error;
  }

  return new ZipExtractionError(
    "ZIP_CORRUPT",
    error instanceof Error ? error.message : "The ZIP archive is corrupt or unreadable.",
  );
}

export async function extractZipPngCandidates(
  options: ZipExtractionOptions,
): Promise<ZipExtractionResult> {
  const {
    extractRoot,
    maxCandidates = MAX_BATCH_FILES,
    maxNestedZipDepth = MAX_NESTED_ZIP_DEPTH,
    nestedZipDepth = 0,
    onProgress,
    pathPrefix = "",
    sharedExtractedBytes,
    shouldCancel,
    zipPath,
  } = options;

  const normalizedZipPath = path.normalize(zipPath);
  const normalizedExtractRoot = path.resolve(extractRoot);
  const extractedBytes = sharedExtractedBytes ?? { value: 0 };

  await assertZipArchiveMagicBytes(normalizedZipPath);
  await assertZipArchiveSize(normalizedZipPath);
  await mkdir(normalizedExtractRoot, { recursive: true });

  const zipFile = await openZipFile(normalizedZipPath);

  return new Promise<ZipExtractionResult>((resolve, reject) => {
    const result: ZipExtractionResult = {
      candidates: [],
      entriesScanned: 0,
      nestedZipsNotOpened: 0,
      pngsDiscovered: 0,
      truncated: false,
    };

    let settled = false;

    const finish = (value: ZipExtractionResult) => {
      if (settled) {
        return;
      }

      settled = true;
      zipFile.close();
      value.candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      zipFile.close();
      reject(mapYauzlError(error));
    };

    const handleEntry = async (entry: yauzl.Entry) => {
      try {
        if (shouldCancel()) {
          finish(result);
          return;
        }

        result.entriesScanned += 1;

        if (result.entriesScanned > MAX_ZIP_ENTRIES) {
          throw new ZipExtractionError(
            "ZIP_TOO_MANY_ENTRIES",
            "The ZIP archive exceeds the 500 entry scan limit.",
          );
        }

        onProgress?.({
          entriesScanned: result.entriesScanned,
          pngsDiscovered: result.pngsDiscovered,
        });

        const entryName = entry.fileName;

        if (isZipSymlinkEntry(entry)) {
          throw new ZipExtractionError(
            "ZIP_SYMLINK_ENTRY",
            "The ZIP archive contains a symlink entry, which is not allowed.",
          );
        }

        if (isZipDirectoryEntry(entryName)) {
          zipFile.readEntry();
          return;
        }

        if (hasZipExtension(entryName)) {
          if (nestedZipDepth >= maxNestedZipDepth) {
            result.nestedZipsNotOpened += 1;
            zipFile.readEntry();
            return;
          }

          assertCompressionRatio(entry);
          assertExtractedByteBudget(extractedBytes.value, entry);

          const nestedZipPath = resolveSafeZipEntryPath(entryName, normalizedExtractRoot);
          await writeZipEntryToDisk(zipFile, entry, nestedZipPath);
          extractedBytes.value += entry.uncompressedSize;

          const nestedExtractRoot = path.join(
            path.dirname(nestedZipPath),
            `${path.basename(nestedZipPath, ".zip")}-extracted`,
          );
          const nestedPrefix = `${pathPrefix}${toZipRelativePath(normalizedExtractRoot, nestedZipPath)}/`;

          const nestedResult = await extractZipPngCandidates({
            extractRoot: nestedExtractRoot,
            maxCandidates: maxCandidates - result.candidates.length,
            maxNestedZipDepth,
            nestedZipDepth: nestedZipDepth + 1,
            onProgress,
            pathPrefix: nestedPrefix,
            sharedExtractedBytes: extractedBytes,
            shouldCancel,
            zipPath: nestedZipPath,
          });

          result.nestedZipsNotOpened += nestedResult.nestedZipsNotOpened;
          result.pngsDiscovered += nestedResult.pngsDiscovered;
          result.truncated = result.truncated || nestedResult.truncated;

          for (const nestedCandidate of nestedResult.candidates) {
            if (result.candidates.length >= maxCandidates) {
              result.truncated = true;
              break;
            }

            result.candidates.push(nestedCandidate);
          }

          zipFile.readEntry();
          return;
        }

        if (hasPngExtension(entryName)) {
          assertCompressionRatio(entry);
          assertExtractedByteBudget(extractedBytes.value, entry);

          const targetPath = resolveSafeZipEntryPath(entryName, normalizedExtractRoot);

          if (result.candidates.length >= maxCandidates) {
            result.truncated = true;
            result.pngsDiscovered += 1;
          } else {
            await writeZipEntryToDisk(zipFile, entry, targetPath);
            extractedBytes.value += entry.uncompressedSize;
            result.pngsDiscovered += 1;

            const relativePath = `${pathPrefix}${toZipRelativePath(normalizedExtractRoot, targetPath)}`;

            result.candidates.push({
              absolutePath: path.normalize(targetPath),
              fileName: path.basename(targetPath),
              relativePath,
            });
          }
        }

        zipFile.readEntry();
      } catch (error) {
        fail(error);
      }
    };

    zipFile.on("entry", (entry) => {
      void handleEntry(entry);
    });

    zipFile.on("end", () => {
      finish(result);
    });

    zipFile.on("error", (error) => {
      fail(error);
    });

    zipFile.readEntry();
  });
}
