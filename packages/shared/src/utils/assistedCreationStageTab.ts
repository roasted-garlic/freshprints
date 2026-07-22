import type { AssistedCreationStatus } from "../constants/assistedCreation/assistedCreation.constants";

/**
 * Studio Assisted Creation stage tab ids (list filters).
 * Single source for Start Work follow-navigation and stage counts.
 */
export type AssistedCreationStageTab =
  | "new"
  | "in_progress"
  | "revisions"
  | "proof_ready"
  | "final_source_needed"
  | "completed";

export const ASSISTED_CREATION_STAGE_TABS: ReadonlyArray<{
  id: AssistedCreationStageTab;
  label: string;
}> = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "revisions", label: "Revisions" },
  { id: "proof_ready", label: "Proof ready" },
  { id: "final_source_needed", label: "Final Source Needed" },
  { id: "completed", label: "Completed" },
] as const;

const STAGE_STATUSES: Record<AssistedCreationStageTab, readonly AssistedCreationStatus[]> = {
  new: ["submitted"],
  in_progress: ["in_progress"],
  revisions: ["revision_requested"],
  proof_ready: ["proof_ready"],
  final_source_needed: ["final_source_needed"],
  completed: ["approved", "rejected", "cancelled"],
};

/** Maps a persisted Assisted Creation status to the Studio stage tab. */
export function stageForAssistedCreationStatus(
  status: AssistedCreationStatus,
): AssistedCreationStageTab {
  if (STAGE_STATUSES.new.includes(status)) {
    return "new";
  }
  if (STAGE_STATUSES.in_progress.includes(status)) {
    return "in_progress";
  }
  if (STAGE_STATUSES.revisions.includes(status)) {
    return "revisions";
  }
  if (STAGE_STATUSES.proof_ready.includes(status)) {
    return "proof_ready";
  }
  if (STAGE_STATUSES.final_source_needed.includes(status)) {
    return "final_source_needed";
  }
  return "completed";
}

export function statusesForAssistedCreationStageTab(
  tab: AssistedCreationStageTab,
): readonly AssistedCreationStatus[] {
  return STAGE_STATUSES[tab];
}
