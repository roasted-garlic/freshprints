import {
  isAllowedPortalHelpVideoUrl,
  resolvePortalVideoEmbedUrl,
  type PortalResolvedVideoEmbed,
  type PortalVideoEmbedProvider,
} from "./portalVideoEmbedUrl";

/** Firestore `settings/{id}` doc for Portal FAQ and How To content. */
export const PORTAL_HELP_SETTINGS_DOC_ID = "portalHelp";

export const PORTAL_HELP_PATH = "/help" as const;
export const PORTAL_HELP_PAGE_TITLE = "FAQ and How To";
/** Visible H1 when the How To videos section is hidden (no published videos). */
export const PORTAL_HELP_PAGE_TITLE_FAQ_ONLY = "FAQ";
export const PORTAL_HELP_PAGE_DESCRIPTION =
  "FAQ and how-to guides for browsing the Fresh Prints design library, submitting print requests, and using the Portal.";
export const PORTAL_HELP_INTRO =
  "Expand a question for quick answers, or watch How To videos for walkthroughs.";
/** Page lead when How To is hidden because there are no videos yet. */
export const PORTAL_HELP_INTRO_FAQ_ONLY =
  "Expand a question for quick answers about browsing designs, print requests, and your account.";

export const PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH = 200;
export const PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH = 4000;
export const PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH = 160;
export const PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH = 500;
export const PORTAL_HELP_VIDEO_URL_MAX_LENGTH = 500;
export const PORTAL_HELP_ID_MAX_LENGTH = 64;
export const PORTAL_HELP_MAX_FAQS = 50;
export const PORTAL_HELP_MAX_VIDEOS = 20;

export type PortalHelpTextFaq = {
  id: string;
  question: string;
  /** Plain text only — line breaks allowed; no HTML. */
  answer: string;
  /** Ascending display order (0-based preferred). */
  order: number;
};

export type PortalHelpVideoItem = {
  id: string;
  title: string;
  description?: string;
  /** HTTPS YouTube or Vimeo URL only. */
  videoUrl: string;
  order: number;
};

export type PortalHelpSettings = {
  faqs: PortalHelpTextFaq[];
  videos: PortalHelpVideoItem[];
  updatedAt?: unknown;
  updatedBy?: string;
};

export type PortalHelpSettingsInput = {
  faqs: PortalHelpTextFaq[];
  videos: PortalHelpVideoItem[];
};

export const DEFAULT_PORTAL_HELP_SETTINGS: Readonly<PortalHelpSettings> = {
  faqs: [],
  videos: [],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.trunc(value);
}

function parseId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const id = value.trim();
  if (!id || id.length > PORTAL_HELP_ID_MAX_LENGTH) {
    return null;
  }
  if (!/^[\w.-]+$/.test(id)) {
    return null;
  }
  return id;
}

function parseRequiredText(
  value: unknown,
  maxLength: number,
  options?: { allowNewlines?: boolean },
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = options?.allowNewlines
    ? value.replace(/\r\n/g, "\n").trim()
    : value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function parseOptionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > maxLength) {
    return undefined;
  }
  return trimmed;
}

function sortByOrder<T extends { order: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id.localeCompare(b.id);
  });
}

function resolveFaq(raw: unknown, index: number): PortalHelpTextFaq | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = parseId(raw.id) ?? `faq-${index}`;
  const question = parseRequiredText(raw.question, PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH);
  const answer = parseRequiredText(raw.answer, PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH, {
    allowNewlines: true,
  });
  if (!question || !answer) {
    return null;
  }
  return {
    id,
    question,
    answer,
    order: clampInt(raw.order, index),
  };
}

function resolveVideo(raw: unknown, index: number): PortalHelpVideoItem | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = parseId(raw.id) ?? `video-${index}`;
  const title = parseRequiredText(raw.title, PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH);
  if (!title) {
    return null;
  }
  const videoUrlRaw =
    typeof raw.videoUrl === "string"
      ? raw.videoUrl.trim()
      : typeof raw.embedUrl === "string"
        ? raw.embedUrl.trim()
        : "";
  if (videoUrlRaw.length > PORTAL_HELP_VIDEO_URL_MAX_LENGTH) {
    return null;
  }
  // Allow empty URL in resolve (placeholder slot); parseInput rejects empty for saved videos.
  if (videoUrlRaw && !isAllowedPortalHelpVideoUrl(videoUrlRaw)) {
    return null;
  }
  const description = parseOptionalText(raw.description, PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH);
  return {
    id,
    title,
    ...(description ? { description } : {}),
    videoUrl: videoUrlRaw,
    order: clampInt(raw.order, index),
  };
}

/**
 * Resolve stored Firestore data into a safe settings object.
 * Invalid items are dropped. Missing doc → empty lists (caller may apply bundled fallbacks).
 */
export function resolvePortalHelpSettings(raw: unknown): PortalHelpSettings {
  if (!isPlainObject(raw)) {
    return { ...DEFAULT_PORTAL_HELP_SETTINGS };
  }

  const faqsRaw = Array.isArray(raw.faqs) ? raw.faqs : [];
  const videosRaw = Array.isArray(raw.videos) ? raw.videos : [];

  const faqs: PortalHelpTextFaq[] = [];
  for (let i = 0; i < faqsRaw.length && faqs.length < PORTAL_HELP_MAX_FAQS; i += 1) {
    const item = resolveFaq(faqsRaw[i], i);
    if (item) {
      faqs.push(item);
    }
  }

  const videos: PortalHelpVideoItem[] = [];
  for (let i = 0; i < videosRaw.length && videos.length < PORTAL_HELP_MAX_VIDEOS; i += 1) {
    const item = resolveVideo(videosRaw[i], i);
    if (item) {
      videos.push(item);
    }
  }

  return {
    faqs: sortByOrder(faqs),
    videos: sortByOrder(videos),
    updatedAt: raw.updatedAt,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : undefined,
  };
}

function parseFaqInput(raw: unknown, index: number, seenIds: Set<string>): PortalHelpTextFaq | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = parseId(raw.id);
  const question = parseRequiredText(raw.question, PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH);
  const answer = parseRequiredText(raw.answer, PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH, {
    allowNewlines: true,
  });
  if (!id || !question || !answer || seenIds.has(id)) {
    return null;
  }
  seenIds.add(id);
  return {
    id,
    question,
    answer,
    order: clampInt(raw.order, index),
  };
}

function parseVideoInput(
  raw: unknown,
  index: number,
  seenIds: Set<string>,
): PortalHelpVideoItem | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = parseId(raw.id);
  const title = parseRequiredText(raw.title, PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH);
  if (!id || !title || seenIds.has(id)) {
    return null;
  }
  const videoUrl =
    typeof raw.videoUrl === "string"
      ? raw.videoUrl.trim()
      : typeof raw.embedUrl === "string"
        ? raw.embedUrl.trim()
        : "";
  if (
    !videoUrl ||
    videoUrl.length > PORTAL_HELP_VIDEO_URL_MAX_LENGTH ||
    !isAllowedPortalHelpVideoUrl(videoUrl)
  ) {
    return null;
  }
  seenIds.add(id);
  const description = parseOptionalText(raw.description, PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH);
  return {
    id,
    title,
    ...(description ? { description } : {}),
    videoUrl,
    order: clampInt(raw.order, index),
  };
}

/**
 * Strict parse for Studio/callable writes. Returns null if any item is invalid
 * or lists exceed caps. Empty lists are valid (clears content).
 */
export function parsePortalHelpSettingsInput(raw: unknown): PortalHelpSettingsInput | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  if (!Array.isArray(raw.faqs) || !Array.isArray(raw.videos)) {
    return null;
  }
  if (raw.faqs.length > PORTAL_HELP_MAX_FAQS || raw.videos.length > PORTAL_HELP_MAX_VIDEOS) {
    return null;
  }

  const faqIds = new Set<string>();
  const faqs: PortalHelpTextFaq[] = [];
  for (let i = 0; i < raw.faqs.length; i += 1) {
    const item = parseFaqInput(raw.faqs[i], i, faqIds);
    if (!item) {
      return null;
    }
    faqs.push(item);
  }

  const videoIds = new Set<string>();
  const videos: PortalHelpVideoItem[] = [];
  for (let i = 0; i < raw.videos.length; i += 1) {
    const item = parseVideoInput(raw.videos[i], i, videoIds);
    if (!item) {
      return null;
    }
    videos.push(item);
  }

  // Normalize order to dense 0..n-1 after sort for stable storage.
  const sortedFaqs = sortByOrder(faqs).map((faq, index) => ({ ...faq, order: index }));
  const sortedVideos = sortByOrder(videos).map((video, index) => ({ ...video, order: index }));

  return { faqs: sortedFaqs, videos: sortedVideos };
}

export function portalHelpVideoProvider(
  videoUrl: string,
): PortalVideoEmbedProvider | null {
  return resolvePortalVideoEmbedUrl(videoUrl)?.provider ?? null;
}

export {
  isAllowedPortalHelpVideoUrl,
  resolvePortalVideoEmbedUrl,
  type PortalResolvedVideoEmbed,
  type PortalVideoEmbedProvider,
};
