import { randomUUID } from "node:crypto";
import path from "node:path";

import type { BatchImportSourceType } from "@fresh-prints/shared/types/import/batchImport.types";

export type BatchImportSessionStatus = "selected" | "discovering" | "cancelled" | "failed" | "finished";

export interface BatchImportSession {
  jobId: string;
  webContentsId: number;
  sourceType: BatchImportSourceType;
  filePaths?: string[];
  folderPath?: string;
  zipFilePath?: string;
  createdAt: string;
  status: BatchImportSessionStatus;
}

const sessionsByJobId = new Map<string, BatchImportSession>();
const cancelRequestedJobIds = new Set<string>();
const validatedPathsByJobId = new Map<string, Set<string>>();
const runningDiscoveryJobIds = new Set<string>();

const ACTIVE_BATCH_STATUSES = new Set<BatchImportSessionStatus>(["selected", "discovering"]);

function normalizeSessionPaths(paths: string[]): string[] {
  return paths.map((filePath) => path.normalize(filePath));
}

export function hasActiveBatchImportSession(): boolean {
  for (const session of sessionsByJobId.values()) {
    if (ACTIVE_BATCH_STATUSES.has(session.status)) {
      return true;
    }
  }

  return false;
}

export function hasActiveBatchImportSessionForWebContents(webContentsId: number): boolean {
  for (const session of sessionsByJobId.values()) {
    if (session.webContentsId === webContentsId && ACTIVE_BATCH_STATUSES.has(session.status)) {
      return true;
    }
  }

  return false;
}

export function getBatchImportSession(jobId: string): BatchImportSession | undefined {
  return sessionsByJobId.get(jobId);
}

export function getActiveBatchImportSession(): BatchImportSession | undefined {
  for (const session of sessionsByJobId.values()) {
    if (ACTIVE_BATCH_STATUSES.has(session.status)) {
      return session;
    }
  }

  return undefined;
}

export function registerBatchImportSelection(input: {
  webContentsId: number;
  sourceType: BatchImportSourceType;
  filePaths?: string[];
  folderPath?: string;
  zipFilePath?: string;
}): BatchImportSession {
  if (hasActiveBatchImportSession()) {
    throw new Error("A batch import session is already active.");
  }

  const jobId = randomUUID();
  const session: BatchImportSession = {
    jobId,
    webContentsId: input.webContentsId,
    sourceType: input.sourceType,
    createdAt: new Date().toISOString(),
    status: "selected",
  };

  if (input.filePaths) {
    session.filePaths = normalizeSessionPaths(input.filePaths);
  }

  if (input.folderPath) {
    session.folderPath = path.normalize(input.folderPath);
  }

  if (input.zipFilePath) {
    session.zipFilePath = path.normalize(input.zipFilePath);
  }

  sessionsByJobId.set(jobId, session);

  return session;
}

export function validateBatchDiscoverySession(
  jobId: string,
  webContentsId: number,
  sourceType: BatchImportSourceType,
): string | null {
  const session = sessionsByJobId.get(jobId);

  if (!session) {
    return "No batch import session was found for the provided job ID.";
  }

  if (session.webContentsId !== webContentsId) {
    return "The batch import session does not belong to this window.";
  }

  if (!ACTIVE_BATCH_STATUSES.has(session.status)) {
    return "The batch import session is no longer active.";
  }

  if (session.sourceType !== sourceType) {
    return "The batch import source type does not match the registered session.";
  }

  return null;
}

export function validateBatchDiscoveryStart(
  jobId: string,
  webContentsId: number,
  sourceType: BatchImportSourceType,
): string | null {
  const sessionError = validateBatchDiscoverySession(jobId, webContentsId, sourceType);

  if (sessionError) {
    return sessionError;
  }

  const session = sessionsByJobId.get(jobId);

  if (!session || session.status !== "selected") {
    return "Batch discovery can only start from a newly selected batch session.";
  }

  if (runningDiscoveryJobIds.has(jobId)) {
    return "Batch discovery is already in progress for this job.";
  }

  if (sourceType === "multiple-png" && (session.filePaths?.length ?? 0) === 0) {
    return "The batch session does not contain any selected PNG files.";
  }

  if (sourceType === "folder" && !session.folderPath) {
    return "The batch session does not contain a selected folder.";
  }

  if (sourceType === "zip" && !session.zipFilePath) {
    return "The batch session does not contain a selected ZIP file.";
  }

  return null;
}

export function markBatchDiscoveryRunning(jobId: string): boolean {
  if (runningDiscoveryJobIds.has(jobId)) {
    return false;
  }

  runningDiscoveryJobIds.add(jobId);
  return true;
}

export function clearBatchDiscoveryRunning(jobId: string): void {
  runningDiscoveryJobIds.delete(jobId);
}

export function isBatchImportCancelRequested(jobId: string): boolean {
  return cancelRequestedJobIds.has(jobId);
}

export function clearBatchImportCancelRequest(jobId: string): void {
  cancelRequestedJobIds.delete(jobId);
}

export function registerBatchValidatedPath(jobId: string, filePath: string): void {
  const normalizedPath = path.normalize(filePath);
  const validatedPaths = validatedPathsByJobId.get(jobId) ?? new Set<string>();

  validatedPaths.add(normalizedPath);
  validatedPathsByJobId.set(jobId, validatedPaths);
}

export function isBatchValidatedPath(jobId: string, filePath: string): boolean {
  return validatedPathsByJobId.get(jobId)?.has(path.normalize(filePath)) ?? false;
}

export function clearBatchValidatedPaths(jobId: string): void {
  validatedPathsByJobId.delete(jobId);
}

export function getBatchSessionFilePaths(jobId: string): string[] {
  const session = sessionsByJobId.get(jobId);

  if (!session?.filePaths) {
    return [];
  }

  return [...session.filePaths];
}

export function getBatchSessionFolderPath(jobId: string): string | null {
  const session = sessionsByJobId.get(jobId);

  return session?.folderPath ?? null;
}

export function getBatchSessionZipPath(jobId: string): string | null {
  const session = sessionsByJobId.get(jobId);

  return session?.zipFilePath ?? null;
}
export function assertBatchDiscoveryRequestMatchesSession(
  jobId: string,
  webContentsId: number,
  request: {
    sourceType: BatchImportSourceType;
    filePaths?: string[];
    folderPath?: string;
    zipFilePath?: string;
  },
): string | null {
  const sessionError = validateBatchDiscoverySession(jobId, webContentsId, request.sourceType);

  if (sessionError) {
    return sessionError;
  }

  const session = sessionsByJobId.get(jobId);

  if (!session) {
    return "No batch import session was found for the provided job ID.";
  }

  if (request.sourceType === "multiple-png") {
    const requestPaths = normalizeSessionPaths(request.filePaths ?? []);
    const sessionPaths = session.filePaths ?? [];

    if (
      requestPaths.length > 0 &&
      (requestPaths.length !== sessionPaths.length ||
        requestPaths.some((filePath, index) => filePath !== sessionPaths[index]))
    ) {
      return "The selected PNG file paths do not match the registered batch session.";
    }
  }

  if (request.sourceType === "folder" && request.folderPath) {
    if (path.normalize(request.folderPath) !== session.folderPath) {
      return "The selected folder path does not match the registered batch session.";
    }
  }

  if (request.sourceType === "zip" && request.zipFilePath) {
    if (path.normalize(request.zipFilePath) !== session.zipFilePath) {
      return "The selected ZIP path does not match the registered batch session.";
    }
  }

  return null;
}

export function markBatchImportSessionDiscovering(jobId: string): boolean {
  const session = sessionsByJobId.get(jobId);

  if (!session || session.status !== "selected") {
    return false;
  }

  session.status = "discovering";
  return true;
}

export function requestBatchImportCancel(jobId: string, webContentsId: number): boolean {
  const session = sessionsByJobId.get(jobId);

  if (!session || session.webContentsId !== webContentsId) {
    return false;
  }

  if (!ACTIVE_BATCH_STATUSES.has(session.status)) {
    return false;
  }

  if (session.status === "discovering") {
    cancelRequestedJobIds.add(jobId);
    return true;
  }

  session.status = "cancelled";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
  clearBatchImportCancelRequest(jobId);
  clearBatchDiscoveryRunning(jobId);
  return true;
}

export function completeBatchImportDiscovery(jobId: string, canceled: boolean): void {
  finalizeBatchImportDiscovery(jobId, canceled ? "canceled" : "completed");
}

export function failBatchImportDiscovery(jobId: string): void {
  finalizeBatchImportDiscovery(jobId, "failed");
}

export function finalizeBatchImportDiscovery(
  jobId: string,
  outcome: "completed" | "canceled" | "failed",
): void {
  clearBatchDiscoveryRunning(jobId);
  clearBatchImportCancelRequest(jobId);

  const session = sessionsByJobId.get(jobId);

  if (!session) {
    return;
  }

  if (outcome === "completed") {
    session.status = "discovering";
    return;
  }

  session.status = outcome === "canceled" ? "cancelled" : "failed";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
}

export function finishBatchImportSession(jobId: string, webContentsId: number): boolean {
  const session = sessionsByJobId.get(jobId);

  if (!session || session.webContentsId !== webContentsId) {
    return false;
  }

  session.status = "finished";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
  clearBatchImportCancelRequest(jobId);
  clearBatchDiscoveryRunning(jobId);
  return true;
}

export function clearBatchImportSessionsForTests(): void {
  sessionsByJobId.clear();
  cancelRequestedJobIds.clear();
  validatedPathsByJobId.clear();
  runningDiscoveryJobIds.clear();
}
