const GENERATED_STAFF_ARTWORK_ID = /^[a-f0-9]{10}$/i;

export const STAFF_ARTWORK_RECONCILIATION_PROJECT_ID = "fresh-prints-dev";

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function filenameStem(value) {
  const filename = text(value).split(/[\\/]/).pop() || "";
  const extensionIndex = filename.lastIndexOf(".");
  return (extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename).trim();
}

function isStructurallyValidCatalogTitle(value) {
  const title = text(value);
  if (!title || new Set(["-", "—", "–", ".", "...", "n/a", "na", "none", "null", "undefined"]).has(title.toLowerCase())) {
    return false;
  }
  return (title.match(/\p{L}/gu) || []).length >= 2 && !/[\u0000-\u001f\u007f]/.test(title);
}

function isImportPlaceholderTitle(title, sourceFileName) {
  const normalizedTitle = text(title).toLowerCase().replace(/\s+/g, " ");
  if (!normalizedTitle) return true;
  if (["imported design", "customer upload"].includes(normalizedTitle)) return true;
  const sourceStem = filenameStem(sourceFileName).toLowerCase();
  if (sourceStem && normalizedTitle === sourceStem) return true;
  if (GENERATED_STAFF_ARTWORK_ID.test(text(title))) return true;
  if (/^\d+\s*\(\d+\)$/.test(text(title))) return true;
  return false;
}

function sourceTitleKind(design, staffArtwork) {
  const title = text(design.title);
  const sourceFileName = text(design.importSourceFileName) || text(staffArtwork?.sourceFileName);
  if (text(design.catalogTitleSource) === "ai_generated") return "trusted_ai";
  if (text(design.catalogTitleSource) === "trusted_import") return "trusted_import";
  if (!title) return "missing";
  if (isImportPlaceholderTitle(title, sourceFileName)) {
    return filenameStem(sourceFileName) && title.toLowerCase() === filenameStem(sourceFileName).toLowerCase()
      ? "filename_derived"
      : "generated_default";
  }
  if (staffArtwork?.catalogTitleSource === "staff") return "explicit_staff";
  return "ambiguous";
}

function hasPath(value) {
  return text(value).length > 0;
}

/**
 * Pure, conservative classifier. It never creates a Design and never decides that an ambiguous
 * human-looking title may be replaced. Storage availability is supplied by the read-only caller.
 */
export function classifyStaffArtworkPromotionReconciliation({ design, staffArtwork, assets = {} }) {
  const sourceStaffArtworkId = text(design?.sourceStaffArtworkId);
  const hasImportSourceFileName = hasPath(design?.importSourceFileName);
  if (!sourceStaffArtworkId || hasImportSourceFileName) {
    return { kind: "not_candidate", patch: {}, reasons: [] };
  }

  const titleKind = sourceTitleKind(design, staffArtwork);
  const sourceFileName = text(design.importSourceFileName) || text(staffArtwork?.sourceFileName);
  const aiTitle = text(design.aiSuggestions?.title);
  const patch = {};
  const reasons = [`legacy_design_shape:${titleKind}`];

  if (sourceFileName) {
    patch.importSourceFileName = sourceFileName;
  } else {
    reasons.push("source_filename_unrecoverable");
  }

  if (titleKind === "generated_default" || titleKind === "filename_derived") {
    if (isStructurallyValidCatalogTitle(aiTitle) && aiTitle !== text(design.title)) {
      patch.title = aiTitle;
      patch.catalogTitleSource = "ai_generated";
      reasons.push("recoverable_ai_title");
    } else if (text(design.catalogTitleSource) === "staff") {
      patch.catalogTitleSource = sourceFileName ? "import_filename" : "legacy_unknown";
      reasons.push(aiTitle ? "ai_title_not_recoverable" : "ai_title_missing");
    }
  } else if (titleKind === "ambiguous") {
    reasons.push("title_authority_ambiguous");
  }

  const missingCanonicalPreview = assets.canonicalPreview !== true;
  const missingCanonicalThumbnail = assets.canonicalThumbnail !== true;
  if (missingCanonicalPreview) {
    if (assets.staffPreview === true) {
      patch.copyPreview = true;
      reasons.push("repairable_preview");
    } else {
      reasons.push("preview_unrecoverable");
    }
  }
  if (missingCanonicalThumbnail) {
    if (assets.staffThumbnail === true) {
      patch.copyThumbnail = true;
      reasons.push("repairable_thumbnail");
    } else {
      reasons.push("thumbnail_unrecoverable");
    }
  }

  const hasUnrecoverableDerivative =
    (missingCanonicalPreview && assets.staffPreview !== true) ||
    (missingCanonicalThumbnail && assets.staffThumbnail !== true);
  const hasAmbiguity = titleKind === "ambiguous";
  const hasRepair = Object.keys(patch).length > 0;
  return {
    kind: hasAmbiguity
      ? "ambiguous"
      : hasUnrecoverableDerivative && !hasRepair
        ? "unrecoverable"
        : hasRepair
          ? "repairable"
          : "already_correct",
    titleKind,
    patch,
    reasons,
  };
}

export function assertStaffArtworkReconciliationProjectId(projectId) {
  if (projectId !== STAFF_ARTWORK_RECONCILIATION_PROJECT_ID) {
    throw new Error(`Refusing Staff Artwork reconciliation outside ${STAFF_ARTWORK_RECONCILIATION_PROJECT_ID}.`);
  }
}
