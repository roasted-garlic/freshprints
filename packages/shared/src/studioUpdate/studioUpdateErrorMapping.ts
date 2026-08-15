/**
 * Maps an unknown updater error (which may originate from electron-updater's GitHub provider and
 * can carry raw HTTP response bodies, headers, cookies, or stack traces embedded directly in its
 * `message` string — see electron-updater's GitHubProvider.js, which interpolates full XML feed
 * bodies and `e.stack` into thrown error messages) to a short, safe, user-facing string.
 *
 * This never inspects or forwards the original error's message text — only a small set of
 * structural signals (HTTP status code, a known error `code`, domain, or none of those) are used
 * to pick a fixed, pre-written message. No part of the original error ever reaches the renderer.
 */
export type StudioUpdateErrorContext = "check" | "download" | "install";

export type StudioUpdateErrorCategory =
  | "check-failed"
  | "download-failed"
  | "install-failed"
  | "network-unavailable"
  | "no-published-releases"
  | "unavailable";

export interface SafeStudioUpdateError {
  category: StudioUpdateErrorCategory;
  /** Short, fixed, non-sensitive user-facing message. Never derived from the raw error text. */
  message: string;
  /** Non-sensitive diagnostic hint safe to log (e.g. an HTTP status code or error code). */
  logHint: string;
}

const INSTALL_FAILED_MESSAGE =
  "The update downloaded but could not be installed. Please install the latest Fresh Prints version manually or try again later.";

function extractHttpStatusCode(error: unknown): number | null {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode: unknown }).statusCode;
    return typeof statusCode === "number" ? statusCode : null;
  }
  return null;
}

function extractErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/** Structural macOS / Squirrel domain when present — never reads error.message. */
function extractErrorDomain(error: unknown): string | null {
  if (error && typeof error === "object" && "domain" in error) {
    const domain = (error as { domain: unknown }).domain;
    return typeof domain === "string" ? domain : null;
  }
  return null;
}

const NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const INSTALL_SIGNATURE_DOMAINS = new Set(["SQRLCodeSignatureErrorDomain"]);

export function toSafeStudioUpdateError(
  error: unknown,
  context: StudioUpdateErrorContext,
): SafeStudioUpdateError {
  const statusCode = extractHttpStatusCode(error);
  const code = extractErrorCode(error);
  const domain = extractErrorDomain(error);

  if (code === "ERR_UPDATER_NO_PUBLISHED_VERSIONS" || code === "ERR_UPDATER_LATEST_VERSION_NOT_FOUND") {
    return {
      category: "no-published-releases",
      message: "No update information is available right now. Studio will keep working normally.",
      logHint: code,
    };
  }

  if (code && NETWORK_ERROR_CODES.has(code)) {
    return {
      category: "network-unavailable",
      message:
        "Studio couldn't reach the update server. Check your connection and try again later.",
      logHint: code,
    };
  }

  if (context === "install") {
    const logHint =
      (domain && INSTALL_SIGNATURE_DOMAINS.has(domain) ? domain : null) ??
      code ??
      domain ??
      (typeof statusCode === "number" ? `HTTP_${statusCode}` : null) ??
      "unknown";

    return {
      category: "install-failed",
      message: INSTALL_FAILED_MESSAGE,
      logHint,
    };
  }

  if (typeof statusCode === "number") {
    return {
      category: context === "download" ? "download-failed" : "check-failed",
      message:
        context === "download"
          ? "The update could not be downloaded. Please try again later."
          : "Unable to check for updates right now. Studio will keep working normally.",
      logHint: `HTTP_${statusCode}`,
    };
  }

  return {
    category: "unavailable",
    message: "The update service is temporarily unavailable. Studio will keep working normally.",
    logHint: code ?? "unknown",
  };
}
