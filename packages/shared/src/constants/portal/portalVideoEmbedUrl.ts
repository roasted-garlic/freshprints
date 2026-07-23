/**
 * Accepts only HTTPS YouTube / Vimeo watch or embed URLs and returns a safe iframe src.
 * Rejects arbitrary hosts — never pass unvalidated strings into iframe `src`.
 */

export type PortalVideoEmbedProvider = "youtube" | "vimeo";

export type PortalResolvedVideoEmbed = {
  provider: PortalVideoEmbedProvider;
  /** Safe iframe src (YouTube nocookie or Vimeo player). */
  embedSrc: string;
  /** Stable id used for iframe title fallbacks. */
  mediaId: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function hostnameOf(url: URL): string {
  return url.hostname.toLowerCase();
}

function youtubeIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
    return parts[1] && /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
  }
  if (parts[0] === "watch") {
    return null;
  }
  // youtu.be/<id>
  return /^[\w-]{6,}$/.test(parts[0]) ? parts[0] : null;
}

export function resolvePortalVideoEmbedUrl(
  rawUrl: string | null | undefined,
): PortalResolvedVideoEmbed | null {
  const trimmed = rawUrl?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // HTTPS only (Studio/Portal public embeds).
  if (url.protocol !== "https:") {
    return null;
  }

  const host = hostnameOf(url);

  if (YOUTUBE_HOSTS.has(host)) {
    let mediaId: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") {
      mediaId = youtubeIdFromPath(url.pathname);
    } else {
      mediaId = url.searchParams.get("v");
      if (!mediaId || !/^[\w-]{6,}$/.test(mediaId)) {
        mediaId = youtubeIdFromPath(url.pathname);
      }
    }
    if (!mediaId) {
      return null;
    }
    return {
      provider: "youtube",
      mediaId,
      embedSrc: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(mediaId)}`,
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    let mediaId: string | null = null;
    if (host === "player.vimeo.com" && parts[0] === "video") {
      mediaId = parts[1] ?? null;
    } else {
      // vimeo.com/<id> or vimeo.com/channels/.../<id> — take last numeric segment
      const numeric = [...parts].reverse().find((p) => /^\d{6,}$/.test(p));
      mediaId = numeric ?? null;
    }
    if (!mediaId || !/^\d{6,}$/.test(mediaId)) {
      return null;
    }
    return {
      provider: "vimeo",
      mediaId,
      embedSrc: `https://player.vimeo.com/video/${encodeURIComponent(mediaId)}`,
    };
  }

  return null;
}

/** True when the URL is an allowed HTTPS YouTube or Vimeo link (empty string is invalid). */
export function isAllowedPortalHelpVideoUrl(rawUrl: string | null | undefined): boolean {
  return resolvePortalVideoEmbedUrl(rawUrl) !== null;
}
