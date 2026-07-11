import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { app, dialog } from "electron";

import {
  buildGangSheetCacheFingerprint,
  sanitizeGangSheetCacheShowId,
} from "@fresh-prints/shared/utils/gangSheetCacheFingerprint";
import type {
  CachedGangSheetSheetMeta,
  GenerateGangSheetPngRequest,
  GenerateGangSheetPngResult,
  GetGangSheetCacheStatusResult,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { getActiveBrowserWindow } from "../../ipc/import/importBrowserWindow";

export interface GangSheetCacheManifest {
  showId: string;
  fingerprint: string;
  baseFileName: string;
  sheets: CachedGangSheetSheetMeta[];
  placedImageCount: number;
  skippedImageCount: number;
  totalByteSize: number;
  warnings: ShowExportImageWarning[];
  warningsFileName: string | null;
}

function resolveCacheRoot(): string {
  return path.join(app.getPath("userData"), "gang-sheet-cache");
}

export function resolveGangSheetCacheDir(showId: string, fingerprint: string): string {
  return path.join(resolveCacheRoot(), sanitizeGangSheetCacheShowId(showId), fingerprint);
}

function resolveManifestPath(cacheDir: string): string {
  return path.join(cacheDir, "manifest.json");
}

export async function clearGangSheetCacheForShow(showId: string): Promise<void> {
  const showDir = path.join(resolveCacheRoot(), sanitizeGangSheetCacheShowId(showId));
  await rm(showDir, { recursive: true, force: true });
}

/** Removes every cached generate/export folder under `userData/gang-sheet-cache`. */
export async function clearAllGangSheetCaches(): Promise<void> {
  await rm(resolveCacheRoot(), { recursive: true, force: true });
}

export async function writeGangSheetCache(input: {
  request: GenerateGangSheetPngRequest;
  fingerprint: string;
  sheets: Array<{ fileName: string; lengthInches: number; heightPx: number; buffer: Buffer }>;
  placedImageCount: number;
  skippedImageCount: number;
  warnings: ShowExportImageWarning[];
}): Promise<GenerateGangSheetPngResult> {
  const { request, fingerprint, sheets, placedImageCount, skippedImageCount, warnings } = input;

  await clearGangSheetCacheForShow(request.showId);

  const cacheDir = resolveGangSheetCacheDir(request.showId, fingerprint);
  await mkdir(cacheDir, { recursive: true });

  const sheetTotal = sheets.length;
  const sheetMeta: CachedGangSheetSheetMeta[] = [];
  let totalByteSize = 0;

  for (const [offset, sheet] of sheets.entries()) {
    const sheetIndex = offset + 1;
    const filePath = path.join(cacheDir, sheet.fileName);
    await writeFile(filePath, sheet.buffer);
    totalByteSize += sheet.buffer.byteLength;
    sheetMeta.push({
      sheetIndex,
      sheetTotal,
      fileName: sheet.fileName,
      lengthInches: sheet.lengthInches,
      heightPx: sheet.heightPx,
      byteSize: sheet.buffer.byteLength,
    });
  }

  let warningsFileName: string | null = null;
  if (warnings.length > 0) {
    warningsFileName = `${request.baseFileName}_GANG_SHEET_WARNINGS.txt`;
    const lines = warnings.map((warning) => `${warning.fileName} [${warning.reason}]: ${warning.message}`);
    await writeFile(
      path.join(cacheDir, warningsFileName),
      `Export warnings\n================\n\n${lines.join("\n")}\n`,
    );
  }

  const manifest: GangSheetCacheManifest = {
    showId: request.showId,
    fingerprint,
    baseFileName: request.baseFileName,
    sheets: sheetMeta,
    placedImageCount,
    skippedImageCount,
    totalByteSize,
    warnings,
    warningsFileName,
  };

  await writeFile(resolveManifestPath(cacheDir), JSON.stringify(manifest, null, 2), "utf8");

  return {
    showId: request.showId,
    fingerprint,
    sheets: sheetMeta,
    placedImageCount,
    skippedImageCount,
    totalByteSize,
    warnings,
  };
}

export async function readGangSheetCacheManifest(
  showId: string,
  fingerprint: string,
): Promise<GangSheetCacheManifest | null> {
  try {
    const raw = await readFile(resolveManifestPath(resolveGangSheetCacheDir(showId, fingerprint)), "utf8");
    const parsed = JSON.parse(raw) as GangSheetCacheManifest;
    if (parsed.showId !== showId || parsed.fingerprint !== fingerprint) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getGangSheetCacheStatus(
  showId: string,
  fingerprint: string,
): Promise<GetGangSheetCacheStatusResult> {
  const manifest = await readGangSheetCacheManifest(showId, fingerprint);
  if (!manifest) {
    return {
      ready: false,
      sheets: [],
      totalByteSize: 0,
      placedImageCount: 0,
      skippedImageCount: 0,
      warnings: [],
    };
  }

  return {
    ready: true,
    sheets: manifest.sheets,
    totalByteSize: manifest.totalByteSize,
    placedImageCount: manifest.placedImageCount,
    skippedImageCount: manifest.skippedImageCount,
    warnings: manifest.warnings,
  };
}

export async function exportCachedGangSheetsToDirectory(
  showId: string,
  fingerprint: string,
): Promise<{ canceled: boolean; savedFilePaths: string[] }> {
  const manifest = await readGangSheetCacheManifest(showId, fingerprint);
  if (!manifest || manifest.sheets.length === 0) {
    throw new Error("No generated gang sheets are cached for this show. Generate first.");
  }

  const cacheDir = resolveGangSheetCacheDir(showId, fingerprint);
  const browserWindow = getActiveBrowserWindow();
  const defaultPath = path.join(cacheDir, manifest.sheets[0]?.fileName ?? "gang-sheet.png");
  const saveDialogOptions = {
    title: "Export gang sheets",
    defaultPath,
    filters: [{ name: "PNG Images", extensions: ["png"] }],
  };

  const dialogResult = browserWindow
    ? await dialog.showSaveDialog(browserWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { canceled: true, savedFilePaths: [] };
  }

  const saveDirectory = path.dirname(dialogResult.filePath);
  const savedFilePaths: string[] = [];

  for (const sheet of manifest.sheets) {
    const destination = path.join(saveDirectory, sheet.fileName);
    await copyFile(path.join(cacheDir, sheet.fileName), destination);
    savedFilePaths.push(destination);
  }

  if (manifest.warningsFileName) {
    await copyFile(
      path.join(cacheDir, manifest.warningsFileName),
      path.join(saveDirectory, manifest.warningsFileName),
    );
  }

  return { canceled: false, savedFilePaths };
}

export async function downloadCachedGangSheetFile(
  showId: string,
  fingerprint: string,
  sheetIndex: number,
): Promise<{ canceled: boolean; savedFilePath: string | null }> {
  const manifest = await readGangSheetCacheManifest(showId, fingerprint);
  const sheet = manifest?.sheets.find((entry) => entry.sheetIndex === sheetIndex);

  if (!manifest || !sheet) {
    throw new Error("That gang sheet is not in the local cache. Generate first.");
  }

  const cacheDir = resolveGangSheetCacheDir(showId, fingerprint);
  const sourcePath = path.join(cacheDir, sheet.fileName);
  const browserWindow = getActiveBrowserWindow();
  const saveDialogOptions = {
    title: `Save gang sheet ${sheet.sheetIndex} of ${sheet.sheetTotal} (${sheet.lengthInches}")`,
    defaultPath: sheet.fileName,
    filters: [{ name: "PNG Images", extensions: ["png"] }],
  };

  const dialogResult = browserWindow
    ? await dialog.showSaveDialog(browserWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { canceled: true, savedFilePath: null };
  }

  await copyFile(sourcePath, dialogResult.filePath);
  return { canceled: false, savedFilePath: dialogResult.filePath };
}

/** Re-export for callers that need to compute fingerprint in main. */
export function fingerprintForRequest(request: GenerateGangSheetPngRequest): string {
  return buildGangSheetCacheFingerprint(request);
}
