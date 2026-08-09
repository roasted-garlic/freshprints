import { invalidateCatalogTagListCache } from "./catalogTagService";
import { invalidateCategoryListCache } from "./categoryService";
import { clearStudioTaxonomyDiskCache } from "./taxonomyMaterializationService";

/** Explicit reset for writes, auth/environment transitions, and developer diagnostics. */
export function clearStudioTaxonomyCaches(): void {
  invalidateCatalogTagListCache();
  invalidateCategoryListCache();
  clearStudioTaxonomyDiskCache();
}
