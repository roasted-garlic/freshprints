/**
 * Base AI catalog tag exclusions — always applied; not removable via Settings UI.
 * Extend via Firestore settings/aiEnrichment.additionalTagExclusions (owner/admin).
 */
export const BASE_AI_TAG_EXCLUSIONS = [
  "death",
  "dead",
  "dying",
  "die",
  "skull",
  "skulls",
  "gore",
  "bloody",
  "blood",
  "coffin",
  "grave",
  "funeral",
  "morbid",
  "macabre",
  "kill",
  "killing",
  "murder",
  "suicide",
  "corpse",
  "cadaver",
] as const;

export const MAX_ADDITIONAL_TAG_EXCLUSIONS = 50;

export const ADDITIONAL_TAG_EXCLUSION_PATTERN = /^[a-z0-9]+$/;
