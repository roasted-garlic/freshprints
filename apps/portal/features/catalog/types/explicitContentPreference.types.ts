export interface ExplicitContentPreferenceContextValue {
  /** Global "show censored content" preference (localStorage-backed). Default `false`. */
  showExplicitContent: boolean;
  setShowExplicitContent: (showExplicitContent: boolean) => void;
  toggleShowExplicitContent: () => void;
}
