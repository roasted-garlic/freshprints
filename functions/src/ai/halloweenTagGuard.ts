/**
 * Halloween must not be inferred from skeleton / skull / bones alone.
 * Used after model tag normalize so prompt guidance and custom Firestore templates
 * cannot leave a false Halloween tag when the only signal is skeletal artwork.
 */

const HALLOWEEN_TAG = "halloween";

/** Art-style / subject tokens that are not enough for Halloween by themselves. */
const SKELETON_ONLY_SIGNALS = [
  "skeleton",
  "skeletons",
  "skull",
  "skulls",
  "bone",
  "bones",
  "skeletal",
] as const;

/**
 * Additional holiday cues that may justify keeping a halloween tag when skeletons
 * are also present. Bare "pumpkin" / "spooky" are intentionally omitted (harvest /
 * mood only). The literal tag "halloween" is not treated as self-justifying.
 */
const HALLOWEEN_SUPPORTING_CUES = [
  "halloween",
  "jackolantern",
  "jack o lantern",
  "jack o lanterns",
  "witch",
  "witches",
  "witchy",
  "haunted",
  "candycorn",
  "candy corn",
  "trickortreat",
  "trick or treat",
  "cobweb",
  "cobwebs",
  "spiderweb",
  "spiderwebs",
  "ghost",
  "ghosts",
] as const;

export interface HalloweenTagGuardContext {
  title?: string;
  description?: string;
  visibleText?: readonly string[];
  /** Candidate tags including halloween; halloween itself is ignored when scanning for cues. */
  tags?: readonly string[];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function buildCueHaystack(context: HalloweenTagGuardContext): string {
  const tagParts = (context.tags ?? [])
    .map(normalizeToken)
    .filter((tag) => tag && tag !== HALLOWEEN_TAG);

  return [
    context.title ?? "",
    context.description ?? "",
    ...(context.visibleText ?? []),
    ...tagParts,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildFullHaystack(context: HalloweenTagGuardContext): string {
  return [
    context.title ?? "",
    context.description ?? "",
    ...(context.visibleText ?? []),
    ...(context.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haystackHasSignal(haystack: string, signal: string): boolean {
  if (!haystack || !signal) {
    return false;
  }

  const normalizedSignal = signal.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (!normalizedSignal) {
    return false;
  }

  if (normalizedSignal.includes(" ")) {
    return haystack.includes(normalizedSignal);
  }

  return new RegExp(`(?:^|\\s)${normalizedSignal}(?:\\s|$)`).test(haystack);
}

export function hasSkeletonOnlySignals(context: HalloweenTagGuardContext): boolean {
  const haystack = buildFullHaystack(context);
  return SKELETON_ONLY_SIGNALS.some((signal) => haystackHasSignal(haystack, signal));
}

export function hasHalloweenSupportingCues(context: HalloweenTagGuardContext): boolean {
  const haystack = buildCueHaystack(context);
  return HALLOWEEN_SUPPORTING_CUES.some((cue) => haystackHasSignal(haystack, cue));
}

/**
 * True when halloween should be removed: the tag is present, skeletal signals exist,
 * and no supporting Halloween cue appears outside the halloween tag itself.
 */
export function shouldStripHalloweenTag(context: HalloweenTagGuardContext): boolean {
  const hasHalloween = (context.tags ?? []).some((tag) => normalizeToken(tag) === HALLOWEEN_TAG);

  if (!hasHalloween) {
    return false;
  }

  if (!hasSkeletonOnlySignals(context)) {
    return false;
  }

  return !hasHalloweenSupportingCues(context);
}

export function filterUnsupportedHalloweenTags<T extends string>(
  tags: readonly T[],
  context: Omit<HalloweenTagGuardContext, "tags"> & { tags?: readonly string[] },
): T[] {
  const guardContext: HalloweenTagGuardContext = {
    ...context,
    tags: context.tags ?? tags,
  };

  if (!shouldStripHalloweenTag(guardContext)) {
    return [...tags];
  }

  return tags.filter((tag) => normalizeToken(tag) !== HALLOWEEN_TAG);
}
