import { app } from "electron";

/**
 * Chrome DevTools requests Autofill CDP commands that Electron does not implement.
 * Chromium logs those failures to stderr each time DevTools opens.
 *
 * @see https://github.com/electron/electron/issues/41614
 * Fixed upstream in Electron 40+; until upgrade, filter the known noise in dev builds.
 */
const DEVTOOLS_AUTOFILL_NOISE = /Request Autofill\.(enable|setAddresses) failed/i;

function isWriteCallback(
  value: BufferEncoding | ((error?: Error | null) => void) | undefined,
): value is (error?: Error | null) => void {
  return typeof value === "function";
}

export function suppressDevToolsAutofillConsoleNoise(): void {
  if (app.isPackaged) {
    return;
  }

  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stderr.write = (
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean => {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");

    if (DEVTOOLS_AUTOFILL_NOISE.test(text)) {
      if (isWriteCallback(encodingOrCallback)) {
        encodingOrCallback();
      } else {
        callback?.();
      }

      return true;
    }

    if (isWriteCallback(encodingOrCallback)) {
      return originalStderrWrite(chunk, encodingOrCallback);
    }

    return originalStderrWrite(chunk, encodingOrCallback, callback);
  };
}
