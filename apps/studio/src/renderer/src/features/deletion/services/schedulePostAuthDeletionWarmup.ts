import type { User } from "../../users/types/user.types";
import { permissionService } from "../../permissions/services/permissionService";
import { warmDeletionCallableBackground } from "./deletionCallableWarmupService";

/**
 * High-frequency deletion *preview* (or single-callable delete/purge) services warmed once after auth,
 * plus staff show-production-recovery preview.
 * Mutate services warm on dialog open instead.
 */
export function listPostAuthDeletionPreviewWarmupCallables(user: User | null | undefined): string[] {
  if (!user) {
    return [];
  }
  const names: string[] = [];
  if (permissionService.canDeleteEligiblePrintRequest(user)) {
    names.push("previewPrintRequestDeletion");
  }
  if (permissionService.canDeleteEligibleUpcomingShow(user)) {
    names.push("previewUpcomingShowDeletion");
  }
  if (permissionService.canDeleteEligibleCustomerUpload(user)) {
    names.push("previewCustomerUploadDeletion");
  }
  if (permissionService.canDeleteEligibleUnapprovedDesigns(user)) {
    names.push("deleteEligibleUnapprovedDesign");
  }
  if (permissionService.canPurgeArchivedDesignAssets(user)) {
    names.push("purgeArchivedDesignAssets");
  }
  if (permissionService.canHardDeleteCustomerAccount(user)) {
    names.push("previewHardDeleteCustomerAccount");
  }
  // Show production recovery impact preview (Mark as Fulfilled / Did Not Print / etc.)
  if (permissionService.isStaff(user)) {
    names.push("previewShowProductionRecovery");
  }
  return names;
}

/**
 * Schedule opportunistic same-service warmups after Studio is authenticated.
 * Does not block startup; failures are swallowed inside warmDeletionCallable.
 */
export function schedulePostAuthDeletionWarmup(user: User | null | undefined): () => void {
  const callables = listPostAuthDeletionPreviewWarmupCallables(user);
  if (callables.length === 0) {
    return () => undefined;
  }

  let cancelled = false;
  const run = () => {
    if (cancelled) {
      return;
    }
    for (const name of callables) {
      warmDeletionCallableBackground(name);
    }
  };

  let idleHandle: number | undefined;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    idleHandle = window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    timeoutHandle = setTimeout(run, 1500);
  }

  return () => {
    cancelled = true;
    if (idleHandle !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleHandle);
    }
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  };
}
