/**
 * Converts a GitHub release's rendered HTML release notes into safe, bounded plain text for
 * display in Studio's Settings UI.
 *
 * electron-updater's `UpdateInfo.releaseNotes` (see `builder-util-runtime`'s `UpdateInfo` type)
 * is `string | Array<{ version: string; note: string | null }> | null` — GitHub renders release
 * body Markdown to a small, predictable HTML vocabulary (paragraphs, links, emphasis, lists,
 * headings, line breaks, code, blockquotes). This is not a general-purpose HTML sanitizer for
 * arbitrary/untrusted web content — it targets exactly that vocabulary. No DOM parser or third-
 * party dependency is used; GitHub's release-note HTML is well-formed enough that a small,
 * carefully tested tag-stripping pass is sufficient and auditable, avoiding an added dependency
 * for a narrow, well-bounded input shape.
 *
 * Never uses dangerouslySetInnerHTML, an iframe, or a webview — the output of this function is
 * always plain text, rendered as plain text.
 */

const MAX_RELEASE_NOTES_LENGTH = 2000;
const TRUNCATION_SUFFIX = "…";

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITIES[entity] ?? match;
  });
}

/**
 * Strips <script>/<style> elements (including their content) entirely — their text content must
 * never survive into the plain-text output, unlike ordinary tags whose inner text we keep.
 */
function stripDangerousElements(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function htmlToPlainText(html: string): string {
  let text = stripDangerousElements(html);

  // Block-level and line-break elements become paragraph/line boundaries before their tags are
  // stripped, so structure survives as plain-text spacing rather than running everything together.
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<(p|div|h[1-6]|blockquote|ul|ol)[^>]*>/gi, "");

  // Anchor text is kept; the href itself is dropped — a raw `<a href="...">` must never render,
  // but the link's visible label (GitHub commonly links commit SHAs, PR numbers, usernames) is
  // still useful plain text.
  text = text.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // Any remaining tag (strong/em/code/pre/span/table/etc.) is stripped, keeping only its text
  // content — this is the general fallback after the structural cases above are handled.
  text = text.replace(/<[^>]+>/g, "");

  text = decodeHtmlEntities(text);

  // Collapse runs of 3+ newlines to exactly 2 (one blank line between paragraphs), and trim
  // trailing whitespace from each line without collapsing intentional word spacing.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function truncateReleaseNotes(text: string): string {
  if (text.length <= MAX_RELEASE_NOTES_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_RELEASE_NOTES_LENGTH).trimEnd()}${TRUNCATION_SUFFIX}`;
}

/** The exact shape electron-updater's UpdateInfo.releaseNotes may take. */
export type RawStudioReleaseNotes = string | Array<{ version: string; note: string | null }> | null | undefined;

/**
 * Normalizes raw release notes (string or per-version array, as electron-updater may provide)
 * into a single safe plain-text value, or null if there is nothing meaningful to show.
 */
export function normalizeStudioReleaseNotes(raw: RawStudioReleaseNotes): string | null {
  let combinedHtml: string;

  if (raw == null) {
    return null;
  }

  if (typeof raw === "string") {
    combinedHtml = raw;
  } else {
    combinedHtml = raw
      .map((entry) => entry.note ?? "")
      .filter((note) => note.trim().length > 0)
      .join("\n\n");
  }

  if (!combinedHtml.trim()) {
    return null;
  }

  const plainText = htmlToPlainText(combinedHtml);

  if (!plainText) {
    return null;
  }

  return truncateReleaseNotes(plainText);
}
