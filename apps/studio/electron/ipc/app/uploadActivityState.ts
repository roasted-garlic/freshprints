/**
 * Mirrors the renderer's "is an import upload in flight" flag into the main process so the window
 * close handler can synchronously decide whether to intercept a close attempt, without an async
 * round-trip inside the `close` event itself.
 */
let isUploadActive = false;
let closeConfirmed = false;

export function setUploadActive(active: boolean): void {
  isUploadActive = active;
}

export function getUploadActive(): boolean {
  return isUploadActive;
}

export function confirmClose(): void {
  closeConfirmed = true;
}

export function consumeCloseConfirmation(): boolean {
  const confirmed = closeConfirmed;
  closeConfirmed = false;
  return confirmed;
}
