const DEV_PROJECT_ID = "fresh-prints-dev";

export function canOpenFirebaseDebugWindow(input: {
  isPackaged: boolean;
  projectId: string;
  isMainWindowSender: boolean;
}): boolean {
  return !input.isPackaged && input.isMainWindowSender && input.projectId === DEV_PROJECT_ID;
}
