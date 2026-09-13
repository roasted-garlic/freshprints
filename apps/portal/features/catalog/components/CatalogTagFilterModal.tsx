'use client';

/**
 * Retired compatibility export. The Portal catalog no longer exposes a legacy tag filter or
 * performs tag facet reads. Keeping this inert export avoids breaking stale imports in downstream
 * bundles while guaranteeing the retired UI cannot issue a read or apply a tag constraint.
 */
export function CatalogTagFilterModal(): null {
  return null;
}
