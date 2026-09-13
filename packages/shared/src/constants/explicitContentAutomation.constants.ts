/**
 * Owner-managed Explicit Content Automation vocabulary defaults and B-light alias map.
 * Used by Autonomous Ready classification only — not Portal display vocabulary.
 */

export const EXPLICIT_CONTENT_AUTOMATION_TERM_MAX_LENGTH = 64;
export const EXPLICIT_CONTENT_AUTOMATION_TERMS_MAX_COUNT = 200;

/** Allowed characters after lowercase trim (letters, digits, space, * - _). */
export const EXPLICIT_CONTENT_AUTOMATION_TERM_PATTERN = /^[a-z0-9][a-z0-9 *_-]{0,63}$/;

/**
 * Owner-approved seed when `settings/aiEnrichment.explicitContentAutomationTerms` is absent.
 * Intentional persisted `[]` must NOT fall back to this list.
 */
export const DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS: readonly string[] = [
  // Strong
  "fuck",
  "motherfucker",
  "shit",
  "bitch",
  "cunt",
  // Common / insults
  "ass",
  "asshole",
  "dumbass",
  "jackass",
  "bastard",
  "douche",
  "douchebag",
  // Sexual / vulgar
  "dick",
  "cock",
  "pussy",
  "twat",
  "whore",
  "slut",
  // Mild
  "damn",
  "dammit",
  "goddamn",
  "goddammit",
  "hell",
  "crap",
  "piss",
  // Acronyms
  "wtf",
  "stfu",
  "fml",
  // Reviewed explicit variants (also seed so owner list is complete without relying on aliases alone)
  "fucked",
  "fucking",
  "fucker",
  "fuckers",
  "motherfucking",
  "shitty",
  "shitting",
  "bullshit",
  "horseshit",
  "dipshit",
  "shithead",
  "bitches",
  "bitchy",
  "damned",
  "crappy",
  "pissed",
  "pissing",
];

/**
 * B-light: code-owned inflections keyed by canonical family.
 * An alias is active only when its canonical OR the alias itself is present in the owner list.
 */
export const EXPLICIT_CONTENT_AUTOMATION_ALIAS_FAMILIES: Readonly<
  Record<string, readonly string[]>
> = {
  fuck: ["fucked", "fucking", "fucker", "fuckers"],
  motherfucker: ["motherfucking"],
  shit: ["shitty", "shitting", "bullshit", "horseshit", "dipshit", "shithead"],
  bitch: ["bitches", "bitchy"],
  damn: ["damned", "dammit"],
  goddamn: ["goddammit"],
  crap: ["crappy"],
  piss: ["pissed", "pissing"],
  ass: ["asshole", "dumbass", "jackass"],
  douche: ["douchebag"],
};
