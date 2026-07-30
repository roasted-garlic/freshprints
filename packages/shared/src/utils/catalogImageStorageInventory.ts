/**
 * Pure classification logic for the Goal #12 dry-run catalog-image Storage inventory. Operates
 * entirely on already-fetched metadata arrays (Storage object listings + bounded Firestore doc
 * data passed in as plain objects) — no Storage/Firestore client calls happen inside this module,
 * so it is directly unit-testable with synthetic fixtures. Mirrors the extraction pattern already
 * proven in `withTimeout.ts`, `withCustomerUploadFinalizeWatchdog.ts`, and
 * `evaluateCustomerUploadFullSizeRetention` — keep the `onCall` I/O shell thin, put every
 * classification decision here.
 */

export type CatalogImageStoragePathFamily = "originals" | "thumbnails" | "previews" | "display";

export type CatalogImageStorageClassification =
  | "referenced"
  | "orphaned_candidate"
  | "purged_per_policy_violation"
  | "promotion_cool_off_duplicate";

export interface CatalogImageStorageObjectMetadata {
  /** Canonical Storage object path, e.g. "thumbnails/abc123.webp" (no leading slash). */
  path: string;
  family: CatalogImageStoragePathFamily;
  designId: string;
  sizeBytes: number;
  /** ISO 8601 string or null if unavailable from GCS metadata. */
  timeCreated: string | null;
  updated: string | null;
}

export interface CatalogImageStorageDesignRecord {
  designId: string;
  status: "imported" | "processing" | "ready" | "rejected" | "archived";
  originalPath?: string | null;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  displayPath?: string | null;
  assetsPurgedAt: unknown;
  sourceCustomerUploadId?: string | null;
}

export interface CatalogImageStoragePromotionRecord {
  uploadId: string;
  promotedDesignId: string;
  /** Epoch milliseconds, or null if unavailable. */
  promotedAtMillis: number | null;
  fullSizePurgedAt: unknown;
}

export interface CatalogImageStorageClassifiedObject extends CatalogImageStorageObjectMetadata {
  classification: CatalogImageStorageClassification;
  reason: string;
  confidence: "high" | "medium" | "low";
  recommendedAction: "none" | "review_before_delete" | "investigate_policy_violation";
  relatedDesignId: string | null;
}

export interface CatalogImageStorageMissingObjectReport {
  designId: string;
  family: CatalogImageStoragePathFamily;
  expectedPath: string;
  reason: string;
}

export interface CatalogImageStorageFamilyTotals {
  family: CatalogImageStoragePathFamily;
  objectCount: number;
  totalBytes: number;
  averageBytes: number;
}

export interface CatalogImageStorageGeneratedAssetTotals {
  /** e.g. "generated/catalog-reference" or "generated/portal-catalog" */
  prefix: string;
  objectCount: number;
  totalBytes: number;
  averageBytes: number;
}

export interface CatalogImageStorageInventoryReport {
  familyTotals: CatalogImageStorageFamilyTotals[];
  classifiedObjects: CatalogImageStorageClassifiedObject[];
  missingObjects: CatalogImageStorageMissingObjectReport[];
  /**
   * Generated JSON manifest totals (e.g. `/generated/catalog-reference/**`,
   * `/generated/portal-catalog/**`). Reported separately from `familyTotals` because these are
   * whole-catalog manifests, not per-design objects — they have no `designId` to cross-reference
   * against `designs` docs, so the referenced/orphaned/purged classification model does not apply
   * to them. Object count and bytes only.
   */
  generatedAssetTotals: CatalogImageStorageGeneratedAssetTotals[];
  summary: {
    totalObjects: number;
    totalBytes: number;
    referencedCount: number;
    orphanedCandidateCount: number;
    purgedPerPolicyViolationCount: number;
    promotionCoolOffDuplicateCount: number;
    missingObjectCount: number;
  };
}

const PROMOTION_COOL_OFF_DAYS_DEFAULT = 14;

function familyPathField(
  family: CatalogImageStoragePathFamily,
): "originalPath" | "thumbnailPath" | "previewPath" | "displayPath" {
  switch (family) {
    case "originals":
      return "originalPath";
    case "thumbnails":
      return "thumbnailPath";
    case "previews":
      return "previewPath";
    case "display":
      return "displayPath";
  }
}

/**
 * True when `design.<family field>` (a canonical `/family/id.ext` path with a leading slash)
 * resolves to the same Storage object as `objectPath` (no leading slash, e.g. from `bucket.getFiles()`).
 */
function designFieldMatchesObjectPath(fieldValue: string | null | undefined, objectPath: string): boolean {
  if (!fieldValue) {
    return false;
  }
  return fieldValue.replace(/^\//, "") === objectPath;
}

function classifyOneObject(
  object: CatalogImageStorageObjectMetadata,
  designsById: Map<string, CatalogImageStorageDesignRecord>,
  promotionsByDesignId: Map<string, CatalogImageStoragePromotionRecord>,
  nowMs: number,
  coolOffDays: number,
): CatalogImageStorageClassifiedObject {
  const design = designsById.get(object.designId);

  if (design) {
    const fieldValue = design[familyPathField(object.family)];
    if (designFieldMatchesObjectPath(fieldValue, object.path)) {
      // Special case: originals/previews on an archived+purged design should not exist per
      // ADR-FP-084 (purgeArchivedDesignAssets deletes originals+previews, keeps thumbnails).
      // If the doc still references it AND the object still exists, that means either the purge
      // never ran or the field wasn't cleared — flag distinctly, never as a routine orphan.
      const purgedPerPolicy = design.assetsPurgedAt != null;
      if (purgedPerPolicy && (object.family === "originals" || object.family === "previews")) {
        return {
          ...object,
          classification: "purged_per_policy_violation",
          reason:
            "Design has assetsPurgedAt set (ADR-FP-084 purge already ran) but this " +
            `${object.family} object still exists and is still referenced by the design doc — ` +
            "purgeArchivedDesignAssets may have failed partway or the field was not cleared.",
          confidence: "high",
          recommendedAction: "investigate_policy_violation",
          relatedDesignId: object.designId,
        };
      }

      return {
        ...object,
        classification: "referenced",
        reason: `Matches designs/${object.designId}.${familyPathField(object.family)} exactly.`,
        confidence: "high",
        recommendedAction: "none",
        relatedDesignId: object.designId,
      };
    }
  }

  const promotion = promotionsByDesignId.get(object.designId);
  if (promotion && promotion.promotedAtMillis != null && promotion.fullSizePurgedAt == null) {
    const ageMs = nowMs - promotion.promotedAtMillis;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    if (ageDays >= 0 && ageDays < coolOffDays) {
      return {
        ...object,
        classification: "promotion_cool_off_duplicate",
        reason:
          `Design was promoted from customer upload ${promotion.uploadId} ${ageDays.toFixed(1)} ` +
          `days ago, within the ${coolOffDays}-day cool-off (ADR-FP-086 §4) — the customer ` +
          "upload's own full-size copy has not been purged yet, so this catalog copy is a known, " +
          "policy-sanctioned temporary duplicate, not an orphan.",
        confidence: "high",
        recommendedAction: "none",
        relatedDesignId: object.designId,
      };
    }
  }

  return {
    ...object,
    classification: "orphaned_candidate",
    reason: design
      ? `A designs/${object.designId} doc exists but its ${familyPathField(object.family)} field ` +
        "does not match this object's path (stale/replaced reference)."
      : `No designs/${object.designId} document exists at all.`,
    confidence: design ? "medium" : "high",
    recommendedAction: "review_before_delete",
    relatedDesignId: design ? object.designId : null,
  };
}

function findMissingObjects(
  designs: CatalogImageStorageDesignRecord[],
  objectPathsByFamily: Map<CatalogImageStoragePathFamily, Set<string>>,
): CatalogImageStorageMissingObjectReport[] {
  const missing: CatalogImageStorageMissingObjectReport[] = [];

  const families: Array<{
    family: CatalogImageStoragePathFamily;
    field: "originalPath" | "thumbnailPath" | "previewPath" | "displayPath";
  }> = [
    { family: "originals", field: "originalPath" },
    { family: "thumbnails", field: "thumbnailPath" },
    { family: "previews", field: "previewPath" },
    { family: "display", field: "displayPath" },
  ];

  for (const design of designs) {
    for (const { family, field } of families) {
      const fieldValue = design[field];
      if (!fieldValue) {
        continue;
      }
      // Archived + purged designs legitimately lack originals/previews (ADR-FP-084) — not a bug.
      if (design.assetsPurgedAt != null && (family === "originals" || family === "previews")) {
        continue;
      }
      const normalizedPath = fieldValue.replace(/^\//, "");
      const existingPaths = objectPathsByFamily.get(family) ?? new Set<string>();
      if (!existingPaths.has(normalizedPath)) {
        missing.push({
          designId: design.designId,
          family,
          expectedPath: normalizedPath,
          reason: `designs/${design.designId}.${field} references "${normalizedPath}" but no matching Storage object was found.`,
        });
      }
    }
  }

  return missing;
}

/**
 * Classifies every Storage object metadata entry and reports Firestore references pointing to
 * missing objects. Never deletes or mutates anything — pure function over already-fetched data.
 */
export function buildCatalogImageStorageInventoryReport(params: {
  objects: CatalogImageStorageObjectMetadata[];
  designs: CatalogImageStorageDesignRecord[];
  promotions: CatalogImageStoragePromotionRecord[];
  nowMs: number;
  coolOffDays?: number;
  /** Generated JSON manifest objects (no per-design classification — see report field doc). */
  generatedAssets?: Array<{ prefix: string; sizeBytes: number }>;
}): CatalogImageStorageInventoryReport {
  const coolOffDays = params.coolOffDays ?? PROMOTION_COOL_OFF_DAYS_DEFAULT;
  const designsById = new Map(params.designs.map((design) => [design.designId, design]));
  const promotionsByDesignId = new Map(
    params.promotions.map((promotion) => [promotion.promotedDesignId, promotion]),
  );

  const classifiedObjects = params.objects.map((object) =>
    classifyOneObject(object, designsById, promotionsByDesignId, params.nowMs, coolOffDays),
  );

  const objectPathsByFamily = new Map<CatalogImageStoragePathFamily, Set<string>>();
  for (const object of params.objects) {
    const set = objectPathsByFamily.get(object.family) ?? new Set<string>();
    set.add(object.path);
    objectPathsByFamily.set(object.family, set);
  }
  const missingObjects = findMissingObjects(params.designs, objectPathsByFamily);

  const familyTotals: CatalogImageStorageFamilyTotals[] = (
    ["originals", "thumbnails", "previews", "display"] as const
  ).map((family) => {
    const objectsInFamily = params.objects.filter((object) => object.family === family);
    const totalBytes = objectsInFamily.reduce((sum, object) => sum + object.sizeBytes, 0);
    return {
      family,
      objectCount: objectsInFamily.length,
      totalBytes,
      averageBytes: objectsInFamily.length > 0 ? Math.round(totalBytes / objectsInFamily.length) : 0,
    };
  });

  const generatedAssetsByPrefix = new Map<string, { count: number; totalBytes: number }>();
  for (const asset of params.generatedAssets ?? []) {
    const entry = generatedAssetsByPrefix.get(asset.prefix) ?? { count: 0, totalBytes: 0 };
    entry.count += 1;
    entry.totalBytes += asset.sizeBytes;
    generatedAssetsByPrefix.set(asset.prefix, entry);
  }
  const generatedAssetTotals: CatalogImageStorageGeneratedAssetTotals[] = Array.from(
    generatedAssetsByPrefix.entries(),
  ).map(([prefix, { count, totalBytes }]) => ({
    prefix,
    objectCount: count,
    totalBytes,
    averageBytes: count > 0 ? Math.round(totalBytes / count) : 0,
  }));

  return {
    familyTotals,
    classifiedObjects,
    missingObjects,
    generatedAssetTotals,
    summary: {
      totalObjects: params.objects.length,
      totalBytes: params.objects.reduce((sum, object) => sum + object.sizeBytes, 0),
      referencedCount: classifiedObjects.filter((o) => o.classification === "referenced").length,
      orphanedCandidateCount: classifiedObjects.filter((o) => o.classification === "orphaned_candidate")
        .length,
      purgedPerPolicyViolationCount: classifiedObjects.filter(
        (o) => o.classification === "purged_per_policy_violation",
      ).length,
      promotionCoolOffDuplicateCount: classifiedObjects.filter(
        (o) => o.classification === "promotion_cool_off_duplicate",
      ).length,
      missingObjectCount: missingObjects.length,
    },
  };
}
