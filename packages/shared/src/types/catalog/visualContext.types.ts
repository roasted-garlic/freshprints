export const VISUAL_CONTEXT_VERSION = "visual-context-v1" as const;

export const VISUAL_CONTEXT_SUMMARY_MAX = 320;
export const VISUAL_CONTEXT_DETAILED_MAX = 2400;
export const VISUAL_CONTEXT_STRING_MAX = 240;
export const VISUAL_CONTEXT_ARRAY_MAX = 12;
export const VISUAL_CONTEXT_ALIAS_MAX = 16;
export const VISUAL_CONTEXT_LINE_MAX = 120;

export interface VisualContextProfile {
  version: typeof VISUAL_CONTEXT_VERSION;
  summary: string;
  detailedDescription: string;
  peopleCharacters?: string[];
  animals?: string[];
  objects?: string[];
  appearance?: string;
  posesActions?: string;
  relationships?: string;
  readableArtworkText?: string[];
  symbols?: string[];
  setting?: string;
  styleComposition?: string;
  colors?: string[];
  themesInterests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  visualJokeOrStory?: string;
  semanticAliases?: string[];
  uncertainties?: string[];
  generatedAt?: string;
  promptVersion?: string;
  model?: string;
  provider?: string;
}
