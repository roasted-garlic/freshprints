import { isOperationalWipeAllowedProjectId } from "../../../packages/shared/src/types/admin/wipeOperationalTestData.types";
import { failedPrecondition } from "./errors";

export function resolveFirebaseProjectId(): string {
  const fromEnv = process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const parsed = JSON.parse(process.env.FIREBASE_CONFIG ?? "{}") as { projectId?: string };
    if (typeof parsed.projectId === "string" && parsed.projectId.trim()) {
      return parsed.projectId.trim();
    }
  } catch {
    // ignore
  }

  return "";
}

export function assertHardDeleteAllowedProject(): string {
  const projectId = resolveFirebaseProjectId();
  if (!projectId || !isOperationalWipeAllowedProjectId(projectId)) {
    throw failedPrecondition(
      "Permanent customer deletion is only allowed on the allowlisted development Firebase project.",
    );
  }
  return projectId;
}
