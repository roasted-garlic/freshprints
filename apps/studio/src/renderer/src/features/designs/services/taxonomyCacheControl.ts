import { invalidateCatalogTagListCache } from "./catalogTagService";
import { invalidateCategoryListCache } from "./categoryService";

/** Explicit reset for writes, auth/environment transitions, and developer diagnostics. */
export function clearStudioTaxonomyCaches(): void {
  invalidateCatalogTagListCache();
  invalidateCategoryListCache();
}
