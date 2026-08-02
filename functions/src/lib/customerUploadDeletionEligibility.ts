import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";

export function resolveCustomerUploadDeletionBlockers(input: {
  printRequestItemCount: number;
  promotedDesignId: unknown;
}): DeletionBlocker[] {
  if (input.printRequestItemCount > 0) {
    return [
      {
        code: "attached_to_print_request",
        message: `This upload is still used by ${input.printRequestItemCount} print request item(s) and cannot be deleted.`,
        count: input.printRequestItemCount,
        navigateHint: "Print Requests",
      },
    ];
  }

  if (typeof input.promotedDesignId === "string" && input.promotedDesignId.trim()) {
    return [
      {
        code: "promoted_to_design",
        message:
          "This upload has already been promoted to the Design Library and cannot be deleted here.",
        navigateHint: "Design Library",
      },
    ];
  }

  return [];
}

export function listCustomerUploadStoragePaths(data: Record<string, unknown>): string[] {
  return [
    data.sourceStoragePath,
    data.productionStoragePath,
    data.previewStoragePath,
    data.thumbnailStoragePath,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}
