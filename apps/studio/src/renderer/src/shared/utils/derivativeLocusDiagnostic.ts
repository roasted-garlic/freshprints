type DiagDetail = Record<string, string | number | boolean | null | undefined>;

/**
 * Renderer-side stage trail for derivative-locus diagnostics.
 * Enabled in Vite DEV, or when VITE_FP_DERIVATIVE_LOCUS_DIAG=1 is baked into a diagnostic package.
 */
export function isDerivativeLocusDiagEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  return import.meta.env.VITE_FP_DERIVATIVE_LOCUS_DIAG === "1";
}

export function logDerivativeLocusDiag(event: {
  stage: string;
  designId?: string;
  fileName?: string;
  jobId?: string;
  ok?: boolean;
  detail?: DiagDetail;
}): void {
  if (!isDerivativeLocusDiagEnabled()) {
    return;
  }

  const payload = {
    scope: "derivative-locus",
    at: new Date().toISOString(),
    ...event,
  };

  console.info(JSON.stringify(payload));

  const api = (
    window as Window & {
      freshPrints?: {
        imports?: {
          logDerivativeLocusDiag?: (event: unknown) => Promise<unknown>;
        };
      };
    }
  ).freshPrints?.imports?.logDerivativeLocusDiag;

  if (typeof api === "function") {
    void api(payload).catch(() => {
      // Diagnostic IPC must never break import.
    });
  }
}

/** First 12 bytes as hex for WebP RIFF magic checks — never log full payloads. */
export function webpMagicHex12(bytes: Uint8Array | undefined | null): string | null {
  if (!bytes || bytes.byteLength < 12) {
    return null;
  }

  return Array.from(bytes.subarray(0, 12))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function sanitizeFirebaseError(error: unknown): {
  message: string;
  code: string | null;
  name: string | null;
} {
  if (error && typeof error === "object") {
    const record = error as {
      code?: unknown;
      firebaseCode?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const code =
      typeof record.code === "string"
        ? record.code
        : typeof record.firebaseCode === "string"
          ? record.firebaseCode
          : null;
    return {
      message:
        typeof record.message === "string" && record.message.trim()
          ? record.message
          : "Unknown error",
      code,
      name: typeof record.name === "string" ? record.name : null,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, code: null, name: error.name };
  }

  return { message: "Unknown error", code: null, name: null };
}
