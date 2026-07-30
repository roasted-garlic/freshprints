const FIREBASE_DEBUG_PANEL_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"] as const;

/**
 * The Firebase Debug panel is a development-only diagnostic tool. It must never be reachable in a
 * production build, and even in a development build it must only activate against the shared
 * `fresh-prints-dev` Firebase project — never a project ID an engineer doesn't recognize as dev.
 */
export function isFirebaseDebugPanelAllowedProjectId(projectId: string): boolean {
  return (FIREBASE_DEBUG_PANEL_ALLOWED_PROJECT_IDS as readonly string[]).includes(projectId);
}

export function isFirebaseDebugPanelEnabled(options: {
  isDevelopmentBuild: boolean;
  projectId: string;
}): boolean {
  return options.isDevelopmentBuild && isFirebaseDebugPanelAllowedProjectId(options.projectId);
}
