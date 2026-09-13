/**
 * Catalog Processing Mode — server-authoritative operating modes for AI enrichment
 * and automation (Slice 4). Missing/invalid values resolve to Manual (never Autonomous).
 */

export const CATALOG_WORKFLOW_MODES = ["manual", "shadow", "autonomous"] as const;

export type CatalogWorkflowMode = (typeof CATALOG_WORKFLOW_MODES)[number];

export const DEFAULT_CATALOG_WORKFLOW_MODE: CatalogWorkflowMode = "manual";

export const CATALOG_WORKFLOW_MODE_LABELS: Record<CatalogWorkflowMode, string> = {
  manual: "Manual Review",
  shadow: "Shadow Automation",
  autonomous: "Autonomous",
};

/** Typed confirmation required to set catalogAutonomousLiveEnabled = true. */
export const ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE = "ENABLE AUTONOMOUS" as const;

/**
 * Fail-safe resolver: missing, invalid, or unreadable → Manual.
 * Never returns autonomous as a default.
 */
export function resolveCatalogWorkflowMode(raw: unknown): CatalogWorkflowMode {
  if (typeof raw !== "string") {
    return DEFAULT_CATALOG_WORKFLOW_MODE;
  }
  const trimmed = raw.trim().toLowerCase();
  if ((CATALOG_WORKFLOW_MODES as readonly string[]).includes(trimmed)) {
    return trimmed as CatalogWorkflowMode;
  }
  return DEFAULT_CATALOG_WORKFLOW_MODE;
}

export function resolveCatalogAutonomousLiveEnabled(raw: unknown): boolean {
  return raw === true;
}

/** Live publication requires both mode=autonomous and live flag. */
export function canPublishAutonomously(input: {
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
}): boolean {
  return (
    input.catalogWorkflowMode === "autonomous" && input.catalogAutonomousLiveEnabled === true
  );
}

export function formatCatalogProcessingModeBadge(mode: CatalogWorkflowMode): string {
  return `Catalog Processing: ${CATALOG_WORKFLOW_MODE_LABELS[mode]}`;
}
