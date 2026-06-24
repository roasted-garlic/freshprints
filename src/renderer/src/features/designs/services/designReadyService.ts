import type { DerivativeProcessingStatus } from "../../../../../../shared/types/import/derivativeGeneration.types";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import {
  type DesignReadyPathValidationResult,
  type MarkDesignReadyPaths,
  validateDesignReadyPaths,
} from "../utils/designReadyPathValidation";
import { designService } from "./designService";

export type { DesignReadyPathValidationResult, MarkDesignReadyPaths };

export interface MarkDesignDerivativesCompleteResult {
  designId: string;
  status: Extract<DerivativeProcessingStatus, "imported">;
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
  design: Design;
}

function assertCanEditDesigns(caller: User): void {
  if (!permissionService.canEditDesigns(caller)) {
    throw new Error("You do not have permission to update design status.");
  }
}

function formatValidationFailure(errors: string[]): Error {
  return new Error(errors[0] ?? "The design derivative paths are invalid.");
}

/**
 * Renderer service for design lifecycle transitions around derivatives and catalog readiness.
 *
 * Phase 3C import uses `markDesignProcessing` and `markDesignDerivativesComplete` only.
 * `markDesignReady` is reserved for a future post-AI-review approval phase.
 */
export const designReadyService = {
  validateReadyPaths(
    design: Pick<Design, "id" | "originalPath">,
    paths: MarkDesignReadyPaths,
  ): DesignReadyPathValidationResult {
    return validateDesignReadyPaths(design, paths);
  },

  async markDesignProcessing(caller: User, designId: string): Promise<Design> {
    assertCanEditDesigns(caller);

    const design = await designService.getDesignById(caller, designId);

    if (design.status !== "imported") {
      throw new Error("Only imported designs can be marked as processing.");
    }

    return designService.updateDesign(caller, designId, { status: "processing" });
  },

  /**
   * Persists canonical derivative paths after Storage upload.
   * Keeps or restores `status: "imported"` — derivatives complete does not mean catalog-ready.
   */
  async markDesignDerivativesComplete(
    caller: User,
    designId: string,
    paths: MarkDesignReadyPaths,
  ): Promise<MarkDesignDerivativesCompleteResult> {
    assertCanEditDesigns(caller);

    const design = await designService.getDesignById(caller, designId);

    if (design.status !== "imported" && design.status !== "processing") {
      throw new Error("Only imported or processing designs can have derivatives completed.");
    }

    const validation = validateDesignReadyPaths(design, paths);

    if (!validation.valid) {
      throw formatValidationFailure(validation.errors);
    }

    const updatedDesign = await designService.updateDesign(caller, designId, {
      status: "imported",
      thumbnailPath: paths.thumbnailPath,
      previewPath: paths.previewPath,
    });

    return {
      designId,
      status: "imported",
      originalPath: paths.originalPath,
      thumbnailPath: paths.thumbnailPath,
      previewPath: paths.previewPath,
      design: updatedDesign,
    };
  },

  /**
   * Reserved for a future post-AI-review approval phase.
   * Do not call from Phase 3C import orchestration.
   */
  async markDesignReady(
    caller: User,
    designId: string,
    paths: MarkDesignReadyPaths,
  ): Promise<{
    designId: string;
    status: Extract<DerivativeProcessingStatus, "ready">;
    originalPath: string;
    thumbnailPath: string;
    previewPath: string;
    design: Design;
  }> {
    assertCanEditDesigns(caller);

    const design = await designService.getDesignById(caller, designId);

    if (design.status !== "imported" && design.status !== "processing") {
      throw new Error("Only imported or processing designs can be marked as ready.");
    }

    const validation = validateDesignReadyPaths(design, paths);

    if (!validation.valid) {
      throw formatValidationFailure(validation.errors);
    }

    const updatedDesign = await designService.updateDesign(caller, designId, {
      status: "ready",
      thumbnailPath: paths.thumbnailPath,
      previewPath: paths.previewPath,
    });

    return {
      designId,
      status: "ready",
      originalPath: paths.originalPath,
      thumbnailPath: paths.thumbnailPath,
      previewPath: paths.previewPath,
      design: updatedDesign,
    };
  },
};
