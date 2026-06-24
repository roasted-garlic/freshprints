import type { DesignStatus } from "../types/designStatus.types";
import { isDesignStatus } from "../types/designStatus.types";

export const DESIGN_LIBRARY_STATUS_QUERY_PARAM = "status";

export const DESIGN_LIBRARY_DEFAULT_STATUS_FILTER = "ready";
export const DESIGN_LIBRARY_ALL_FILTER_VALUE = "all";

export function parseDesignLibraryStatusParam(
  value: string | null,
): DesignStatus | null {
  if (!value || !isDesignStatus(value)) {
    return null;
  }

  return value;
}

export function getDesignLibraryPath(options?: { status?: DesignStatus }): string {
  if (!options?.status) {
    return "/designs";
  }

  const searchParams = new URLSearchParams();
  searchParams.set(DESIGN_LIBRARY_STATUS_QUERY_PARAM, options.status);

  return `/designs?${searchParams.toString()}`;
}
