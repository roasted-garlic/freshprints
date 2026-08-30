/** Trusted DEV Firebase project allowlist for fixture show operations. */
export const DEV_FIXTURE_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"] as const;

export function isDevFixtureAllowedProjectId(projectId: string): boolean {
  return (DEV_FIXTURE_ALLOWED_PROJECT_IDS as readonly string[]).includes(projectId);
}

export function isDevFixtureShowOperationAllowed(options: {
  isDevelopmentBuild: boolean;
  projectId: string;
}): boolean {
  return options.isDevelopmentBuild && isDevFixtureAllowedProjectId(options.projectId);
}
