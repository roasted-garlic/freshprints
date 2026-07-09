import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import type { InboxAlertSoundKind } from "@fresh-prints/shared/types/inboxAlert/inboxAlertIpc.types";
import { app } from "electron";

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
}

function getUserSoundDirectory(userId: string): string {
  return path.join(app.getPath("userData"), "inbox-alert-sounds", sanitizeUserId(userId));
}

function getStoredExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

function mimeTypeForExtension(extension: string): string {
  switch (extension) {
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    default:
      return "audio/mpeg";
  }
}

export function getInboxAlertSoundFilePath(userId: string, soundKind: InboxAlertSoundKind): string | null {
  const directory = getUserSoundDirectory(userId);

  if (!existsSync(directory)) {
    return null;
  }

  for (const extension of [".mp3", ".wav", ".ogg", ".m4a", ".aac"]) {
    const candidate = path.join(directory, `${soundKind}${extension}`);

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function saveInboxAlertSoundFile(
  userId: string,
  soundKind: InboxAlertSoundKind,
  sourcePath: string,
): { fileName: string; storedPath: string } {
  const directory = getUserSoundDirectory(userId);
  mkdirSync(directory, { recursive: true });

  for (const extension of [".mp3", ".wav", ".ogg", ".m4a", ".aac"]) {
    const existingPath = path.join(directory, `${soundKind}${extension}`);

    if (existsSync(existingPath)) {
      rmSync(existingPath, { force: true });
    }
  }

  const extension = getStoredExtension(sourcePath) || ".mp3";
  const storedPath = path.join(directory, `${soundKind}${extension}`);
  copyFileSync(sourcePath, storedPath);

  return {
    fileName: path.basename(storedPath),
    storedPath,
  };
}

export function clearInboxAlertSoundFile(userId: string, soundKind: InboxAlertSoundKind): boolean {
  const storedPath = getInboxAlertSoundFilePath(userId, soundKind);

  if (!storedPath) {
    return false;
  }

  rmSync(storedPath, { force: true });
  return true;
}

export function readInboxAlertSoundDataUrl(userId: string, soundKind: InboxAlertSoundKind): string | null {
  const storedPath = getInboxAlertSoundFilePath(userId, soundKind);

  if (!storedPath) {
    return null;
  }

  const extension = getStoredExtension(storedPath);
  const mimeType = mimeTypeForExtension(extension);
  const buffer = readFileSync(storedPath);

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function getStoredInboxAlertSoundFileName(userId: string, soundKind: InboxAlertSoundKind): string | null {
  const storedPath = getInboxAlertSoundFilePath(userId, soundKind);

  return storedPath ? path.basename(storedPath) : null;
}
