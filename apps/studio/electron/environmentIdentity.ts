export type StudioEnvironment = "development" | "production";

export interface StudioEnvironmentIdentity {
  environment: StudioEnvironment;
  userDataDirectoryName: string;
  windowsAppUserModelId: string;
  isDevelopment: boolean;
}

const DEV_PROJECT_ID = "fresh-prints-dev";

export function getStudioEnvironmentIdentity(projectId: string | undefined): StudioEnvironmentIdentity {
  const isDevelopment = projectId?.trim() === DEV_PROJECT_ID;

  return isDevelopment
    ? {
        environment: "development",
        userDataDirectoryName: "Fresh Prints Studio Dev",
        windowsAppUserModelId: "com.freshprints.studio.dev",
        isDevelopment: true,
      }
    : {
        environment: "production",
        userDataDirectoryName: "Fresh Prints Studio",
        windowsAppUserModelId: "com.freshprints.studio",
        isDevelopment: false,
      };
}

