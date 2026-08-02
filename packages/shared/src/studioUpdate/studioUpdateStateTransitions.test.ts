import assert from "node:assert/strict";
import test from "node:test";

import type { StudioUpdateState } from "../types/studioUpdate/studioUpdateIpc.types";
import {
  applyCheckingStarted,
  applyDownloadProgress,
  applyPostpone,
  applyUpdateAvailable,
  applyUpdateDownloaded,
  applyUpdateError,
  applyUpdateNotAvailable,
  canRestartAndInstall,
  canStartDownload,
} from "./studioUpdateStateTransitions";

function baseState(overrides: Partial<StudioUpdateState> = {}): StudioUpdateState {
  return {
    status: "idle",
    channel: "stable",
    currentVersion: "1.0.0-beta.1",
    isUpdateCapable: true,
    availableRelease: null,
    downloadProgress: null,
    isPostponed: false,
    errorMessage: null,
    lastCheckedAt: null,
    ...overrides,
  };
}

test("applyCheckingStarted sets status to checking and clears any prior error", () => {
  const next = applyCheckingStarted(baseState({ status: "error", errorMessage: "boom" }));
  assert.equal(next.status, "checking");
  assert.equal(next.errorMessage, null);
});

test("applyUpdateAvailable sets the release and clears postpone", () => {
  const release = { version: "1.0.0-beta.2", releaseName: null, releaseNotes: null, releaseDate: null };
  const next = applyUpdateAvailable(baseState({ isPostponed: true }), release);
  assert.equal(next.status, "available");
  assert.equal(next.isPostponed, false);
  assert.deepEqual(next.availableRelease, release);
});

test("applyUpdateNotAvailable clears release and progress", () => {
  const next = applyUpdateNotAvailable(
    baseState({
      status: "checking",
      availableRelease: { version: "1.0.0-beta.2", releaseName: null, releaseNotes: null, releaseDate: null },
      downloadProgress: { percent: 10, transferredBytes: 1, totalBytes: 10, bytesPerSecond: 1 },
    }),
  );
  assert.equal(next.status, "up-to-date");
  assert.equal(next.availableRelease, null);
  assert.equal(next.downloadProgress, null);
});

test("applyDownloadProgress tracks status and progress together", () => {
  const progress = { percent: 42, transferredBytes: 42, totalBytes: 100, bytesPerSecond: 5 };
  const next = applyDownloadProgress(baseState({ status: "available" }), progress);
  assert.equal(next.status, "downloading");
  assert.deepEqual(next.downloadProgress, progress);
});

test("applyUpdateDownloaded clears progress and marks downloaded", () => {
  const next = applyUpdateDownloaded(
    baseState({
      status: "downloading",
      downloadProgress: { percent: 100, transferredBytes: 100, totalBytes: 100, bytesPerSecond: 0 },
    }),
  );
  assert.equal(next.status, "downloaded");
  assert.equal(next.downloadProgress, null);
});

test("applyUpdateError records the message and status", () => {
  const next = applyUpdateError(baseState({ status: "downloading" }), "network failure");
  assert.equal(next.status, "error");
  assert.equal(next.errorMessage, "network failure");
});

test("applyPostpone only applies while an update is available or downloaded", () => {
  assert.equal(applyPostpone(baseState({ status: "available" })).isPostponed, true);
  assert.equal(applyPostpone(baseState({ status: "downloaded" })).isPostponed, true);
  assert.equal(applyPostpone(baseState({ status: "idle" })).isPostponed, false);
  assert.equal(applyPostpone(baseState({ status: "checking" })).isPostponed, false);
});

test("canStartDownload requires update-capable + available status", () => {
  assert.equal(canStartDownload(baseState({ status: "available" })), true);
  assert.equal(canStartDownload(baseState({ status: "downloading" })), false);
  assert.equal(canStartDownload(baseState({ status: "available", isUpdateCapable: false })), false);
});

test("canRestartAndInstall requires update-capable + downloaded status", () => {
  assert.equal(canRestartAndInstall(baseState({ status: "downloaded" })), true);
  assert.equal(canRestartAndInstall(baseState({ status: "available" })), false);
  assert.equal(canRestartAndInstall(baseState({ status: "downloaded", isUpdateCapable: false })), false);
});
