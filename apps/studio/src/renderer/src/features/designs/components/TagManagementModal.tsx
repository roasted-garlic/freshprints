import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ArchivedToolbarButton, BackToolbarButton } from "../../../shared/components/ArchivedToolbarButton";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { CatalogAliasChipInput } from "../../../shared/components/CatalogAliasChipInput";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useCatalogTags } from "../hooks/useCatalogTags";
import type { CatalogTag } from "../types/catalogTag.types";
import {
  type BulkCatalogTagImportItem,
  type BulkCatalogTagImportRejectedItem,
  validateBulkCatalogTagJson,
} from "../utils/bulkCatalogTagImport";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

type TagEditorMode = "list" | "create" | "edit" | "bulk-import";

interface TagFormValues {
  aliasesInput: string;
  name: string;
  preferredWhen: string;
}

interface BulkTagImportResult {
  createdNames: string[];
  failures: Array<{ name: string; message: string }>;
}

const TAG_PREFERRED_WHEN_PREVIEW_LENGTH = 150;
const TAG_MANAGEMENT_LIST_BODY_ID = "tag-management-list-body";

const emptyTagFormValues: TagFormValues = {
  aliasesInput: "",
  name: "",
  preferredWhen: "",
};

function mapTagToFormValues(tag: CatalogTag): TagFormValues {
  return {
    aliasesInput: tag.aliases.join(", "),
    name: tag.name,
    preferredWhen: tag.preferredWhen,
  };
}

function parseAliasesInput(value: string): string[] {
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function sortTags(tags: CatalogTag[]): CatalogTag[] {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name));
}

function tagMatchesSearch(tag: CatalogTag, searchQuery: string): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return (
    tag.name.toLowerCase().includes(normalizedQuery) ||
    tag.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery)) ||
    tag.preferredWhen.toLowerCase().includes(normalizedQuery)
  );
}

function shouldOfferPreferredWhenExpansion(preferredWhen: string): boolean {
  return preferredWhen.length > TAG_PREFERRED_WHEN_PREVIEW_LENGTH;
}

export function TagManagementModal({ isOpen, onClose, onUpdated }: TagManagementModalProps) {
  const { user } = useAuth();
  const canManageTags = permissionService.canManageTags(user);
  const canBulkImportTags = permissionService.canBulkImportTags(user);
  const {
    actionError,
    archiveTag,
    bulkCreateTags,
    clearActionError,
    createTag,
    error: loadError,
    isLoading,
    isSubmitting,
    reloadTags,
    tags,
    updateTag,
  } = useCatalogTags({ includeArchived: true });

  const [editorMode, setEditorMode] = useState<TagEditorMode>("list");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formValues, setFormValues] = useState<TagFormValues>(emptyTagFormValues);
  const [editingTag, setEditingTag] = useState<CatalogTag | null>(null);
  const [tagToArchive, setTagToArchive] = useState<CatalogTag | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bulkImportInput, setBulkImportInput] = useState("");
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [bulkImportResult, setBulkImportResult] = useState<BulkTagImportResult | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [hasCompletedOpenLoad, setHasCompletedOpenLoad] = useState(false);
  const [expandedTagPreferredWhen, setExpandedTagPreferredWhen] = useState<Set<string>>(
    () => new Set(),
  );
  const wasOpenRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bulkImportTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bulkImportSummaryRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollListToTopRef = useRef(false);

  const activeTags = useMemo(
    () => sortTags(tags.filter((tag) => tag.status === "approved")),
    [tags],
  );
  const archivedTags = useMemo(
    () => sortTags(tags.filter((tag) => tag.status === "archived")),
    [tags],
  );
  const visibleTags = useMemo(
    () =>
      (showArchived ? archivedTags : activeTags).filter((tag) =>
        tagMatchesSearch(tag, searchQuery),
      ),
    [activeTags, archivedTags, searchQuery, showArchived],
  );

  const isMutatingTags = isSubmitting || isBulkImporting;
  const shouldShowTagLoading = visibleTags.length === 0 && (isLoading || !hasCompletedOpenLoad);
  const bulkImportValidation = useMemo<{
    accepted: BulkCatalogTagImportItem[];
    error: string | null;
    rejected: BulkCatalogTagImportRejectedItem[];
  }>(() => {
    if (editorMode !== "bulk-import" || !bulkImportInput.trim()) {
      return { accepted: [], error: null, rejected: [] };
    }

    try {
      return { error: null, ...validateBulkCatalogTagJson(bulkImportInput) };
    } catch (error) {
      return {
        accepted: [],
        error: error instanceof Error ? error.message : "Unable to parse tag import JSON.",
        rejected: [],
      };
    }
  }, [bulkImportInput, editorMode]);
  const bulkImportPreview = bulkImportValidation.accepted;
  const bulkImportRejectedItems = bulkImportValidation.rejected;
  const currentTagTotal = showArchived ? archivedTags.length : activeTags.length;
  const tagStatusLabel = showArchived ? "archived" : "approved";
  const tagCountNoun = currentTagTotal === 1 ? "tag" : "tags";
  const tagCountLabel = searchQuery.trim()
    ? `${visibleTags.length} of ${currentTagTotal} ${tagStatusLabel} ${tagCountNoun}`
    : `${currentTagTotal} ${tagStatusLabel} ${tagCountNoun}`;

  useEffect(() => {
    let didCancel = false;

    if (!isOpen) {
      wasOpenRef.current = false;
      setHasCompletedOpenLoad(false);
      return;
    }

    if (wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = true;
    setEditorMode("list");
    setShowArchived(false);
    setSearchQuery("");
    setFormValues(emptyTagFormValues);
    setEditingTag(null);
    setTagToArchive(null);
    setSuccessMessage(null);
    setBulkImportInput("");
    setBulkImportError(null);
    setBulkImportResult(null);
    setHasCompletedOpenLoad(false);
    setExpandedTagPreferredWhen(new Set());
    clearActionError();

    void reloadTags().finally(() => {
      if (!didCancel) {
        setHasCompletedOpenLoad(true);
      }
    });

    return () => {
      didCancel = true;
    };
  }, [clearActionError, isOpen, reloadTags]);

  useEffect(() => {
    if (
      editorMode === "bulk-import" &&
      !bulkImportValidation.error &&
      (bulkImportPreview.length > 0 || bulkImportRejectedItems.length > 0)
    ) {
      scrollBulkImportSummaryIntoView();
    }
  }, [bulkImportPreview.length, bulkImportRejectedItems.length, bulkImportValidation.error, editorMode]);

  useEffect(() => {
    if (editorMode !== "list" || !shouldScrollListToTopRef.current) {
      return;
    }

    shouldScrollListToTopRef.current = false;

    window.requestAnimationFrame(() => {
      document.getElementById(TAG_MANAGEMENT_LIST_BODY_ID)?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    });
  }, [editorMode]);

  if (!user || !permissionService.canViewDesigns(user)) {
    return null;
  }

  function openCreateForm() {
    clearActionError();
    setSuccessMessage(null);
    setBulkImportError(null);
    setBulkImportResult(null);
    setEditingTag(null);
    setFormValues(emptyTagFormValues);
    setEditorMode("create");
  }

  function openEditForm(tag: CatalogTag) {
    clearActionError();
    setSuccessMessage(null);
    setBulkImportError(null);
    setBulkImportResult(null);
    setEditingTag(tag);
    setFormValues(mapTagToFormValues(tag));
    setEditorMode("edit");
  }

  function returnToList() {
    clearActionError();
    setEditingTag(null);
    setFormValues(emptyTagFormValues);
    setEditorMode("list");
  }

  function returnToListAtTop() {
    shouldScrollListToTopRef.current = true;
    returnToList();
  }

  function openBulkImport() {
    if (isMutatingTags) {
      return;
    }

    clearActionError();
    setSuccessMessage(null);
    setBulkImportInput("");
    setBulkImportError(null);
    setBulkImportResult(null);
    setEditorMode("bulk-import");
  }

  function scrollBulkImportTextareaToEnd() {
    window.requestAnimationFrame(() => {
      const textarea = bulkImportTextareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.scrollTop = textarea.scrollHeight;
    });
  }

  function scrollBulkImportSummaryIntoView() {
    window.requestAnimationFrame(() => {
      bulkImportSummaryRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    });
  }

  function handleBulkImportInputChange(value: string) {
    setBulkImportInput(value);
    setBulkImportError(null);
    setBulkImportResult(null);
    setSuccessMessage(null);
    scrollBulkImportTextareaToEnd();
  }

  function toggleTagPreferredWhen(tagId: string) {
    setExpandedTagPreferredWhen((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(tagId)) {
        nextIds.delete(tagId);
      } else {
        nextIds.add(tagId);
      }

      return nextIds;
    });
  }

  function handleClearTagSearch() {
    setSearchQuery("");

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  async function handleBulkImport() {
    clearActionError();
    setBulkImportError(null);
    setBulkImportResult(null);
    setSuccessMessage(null);

    let parsedTags: BulkCatalogTagImportItem[];
    let pastedRejectedCount = 0;

    try {
      const validation = validateBulkCatalogTagJson(bulkImportInput);
      parsedTags = validation.accepted;
      pastedRejectedCount = validation.rejected.length;
    } catch (error) {
      setBulkImportError(error instanceof Error ? error.message : "Unable to parse tag import JSON.");
      return;
    }

    if (parsedTags.length === 0) {
      setBulkImportError(
        pastedRejectedCount > 0
          ? `No accepted tags are available to import. Rejected ${pastedRejectedCount}.`
          : "No accepted tags are available to import.",
      );
      return;
    }

    setIsBulkImporting(true);

    try {
      const result = await bulkCreateTags(
        parsedTags.map((tag) => ({
          aliases: tag.aliases,
          name: tag.name,
          preferredWhen: tag.preferredWhen,
        })),
      );
      await onUpdated();
      setBulkImportResult(result);

      const totalRejectedCount = pastedRejectedCount + result.failures.length;

      if (result.createdNames.length > 0 && totalRejectedCount === 0) {
        setSuccessMessage(`Imported ${result.createdNames.length} tag${result.createdNames.length === 1 ? "" : "s"} successfully.`);
        returnToListAtTop();
      } else if (result.createdNames.length > 0) {
        setSuccessMessage(`Imported ${result.createdNames.length} tag${result.createdNames.length === 1 ? "" : "s"}. Rejected ${totalRejectedCount}.`);
        returnToListAtTop();
      } else {
        setBulkImportError(`No tags were imported. Rejected ${totalRejectedCount}.`);
      }
    } finally {
      setIsBulkImporting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearActionError();

    try {
      const input = {
        aliases: parseAliasesInput(formValues.aliasesInput),
        name: formValues.name,
        preferredWhen: formValues.preferredWhen,
      };

      if (editorMode === "create") {
        await createTag(input);
        setSuccessMessage("Tag created successfully.");
      } else if (editorMode === "edit" && editingTag) {
        await updateTag(editingTag.id, input);
        setSuccessMessage("Tag updated successfully.");
      }

      await onUpdated();
      returnToList();
    } catch {
      // Error handled in hook.
    }
  }

  async function handleArchiveConfirm() {
    if (!tagToArchive) {
      return;
    }

    clearActionError();

    try {
      await archiveTag(tagToArchive.id);
      await onUpdated();
      setSuccessMessage(`${tagToArchive.name} archived successfully.`);
      setTagToArchive(null);
    } catch {
      // Error handled in hook.
    }
  }

  const formTitle =
    editorMode === "create"
      ? "Add tag"
      : editingTag?.status === "archived"
        ? "Edit archived tag"
        : "Edit tag";

  return (
    <DesignLibraryModal
      ariaLabelledBy="tag-management-title"
      isOpen={isOpen}
      onClose={onClose}
    >
      {editorMode === "list" ? (
        <>
          <ModalHeader>
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 id="tag-management-title">Tags</h2>
              <p>
                {canManageTags
                  ? "Create, edit, archive, and bulk import approved design tags."
                  : "View approved design tags. Tag changes require owner or admin access."}
              </p>
            </div>

            <button
              aria-label="Close tags"
              className="icon-button icon-button-md icon-button-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.2} />
            </button>
          </ModalHeader>

          <ModalBody id={TAG_MANAGEMENT_LIST_BODY_ID}>
            <div className="category-management-toolbar">
              {showArchived ? (
                <BackToolbarButton onClick={() => setShowArchived(false)} />
              ) : (
                <ArchivedToolbarButton onClick={() => setShowArchived(true)} />
              )}

              {canManageTags && !showArchived ? (
                <div className="category-management-toolbar-actions">
                  {canBulkImportTags ? (
                    <Button onClick={openBulkImport} type="button" variant="secondary">
                      Bulk import
                    </Button>
                  ) : null}
                  <Button onClick={openCreateForm} type="button">
                    Add tag
                  </Button>
                </div>
              ) : null}
            </div>

            <TextInput
              label="Search tags"
              name="tagManagementSearch"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, alias, or guidance..."
              ref={searchInputRef}
              trailingControl={
                searchQuery ? (
                  <button
                    aria-label="Clear tag search"
                    className="form-input-clear-button"
                    onClick={handleClearTagSearch}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} strokeWidth={2.2} />
                  </button>
                ) : null
              }
              value={searchQuery}
            />

            <div className="category-management-count-row" aria-live="polite">
              <span className="design-library-count-chip">{tagCountLabel}</span>
            </div>

            {loadError ? (
              <p className="auth-message auth-message-error" role="alert">
                {loadError}
              </p>
            ) : null}

            {actionError ? (
              <p className="auth-message auth-message-error" role="alert">
                {actionError}
              </p>
            ) : null}

            {successMessage ? (
              <DismissibleSuccessAlert
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
                showProgress={false}
              />
            ) : null}

            <div className="category-management-list" role="list">
              {shouldShowTagLoading ? (
                <div className="category-management-list-loading">
                  <p className="design-details-muted">Loading tags...</p>
                </div>
              ) : visibleTags.length === 0 ? (
                <p className="design-details-muted">
                  {showArchived ? "No archived tags." : "No approved tags match this view."}
                </p>
              ) : (
                visibleTags.map((tag) => {
                  const preferredWhen = tag.preferredWhen.trim();
                  const preferredWhenId = `tag-preferred-when-${tag.id}`;
                  const isPreferredWhenExpanded = expandedTagPreferredWhen.has(tag.id);
                  const canExpandPreferredWhen = shouldOfferPreferredWhenExpansion(preferredWhen);

                  return (
                    <article className="category-management-item" key={tag.id} role="listitem">
                      <div className="category-management-item-copy">
                        <div className="category-management-item-header">
                          <h3>{tag.name}</h3>
                          {tag.status !== "approved" ? <Badge variant="default">Archived</Badge> : null}
                        </div>
                        <div className="category-management-text-block">
                          <span className="category-management-field-label">Preferred when</span>
                          <p
                            className={[
                              "category-management-item-detail",
                              isPreferredWhenExpanded ? "category-management-item-detail-expanded" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            id={preferredWhenId}
                          >
                            {preferredWhen}
                          </p>
                          {canExpandPreferredWhen ? (
                            <Button
                              aria-controls={preferredWhenId}
                              aria-expanded={isPreferredWhenExpanded}
                              className="category-management-text-toggle"
                              onClick={() => toggleTagPreferredWhen(tag.id)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {isPreferredWhenExpanded ? "Show less" : "Show all"}
                            </Button>
                          ) : null}
                        </div>
                        {tag.aliases.length > 0 ? (
                          <div className="category-management-alias-block">
                            <span className="category-management-field-label">Aliases</span>
                            <div className="category-management-alias-list" aria-label={`${tag.name} aliases`}>
                              {tag.aliases.map((alias) => (
                                <span className="category-management-alias-chip" key={alias}>
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {canManageTags ? (
                        <div className="category-management-item-actions">
                          <Button onClick={() => openEditForm(tag)} type="button" variant="secondary">
                            Edit
                          </Button>
                          {tag.status === "approved" ? (
                            <Button
                              disabled={isMutatingTags}
                              onClick={() => setTagToArchive(tag)}
                              type="button"
                              variant="danger"
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </ModalFooter>
        </>
      ) : editorMode === "bulk-import" ? (
        <>
          <ModalHeader>
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 id="tag-management-title">Bulk import tags</h2>
              <p>Paste a JSON array of objects with name, aliases, and preferredWhen only.</p>
            </div>

            <button
              aria-label="Close tags"
              className="icon-button icon-button-md icon-button-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.2} />
            </button>
          </ModalHeader>

          <ModalBody>
            <section className="category-bulk-import-panel category-bulk-import-panel-modal">
              <AutoResizeTextarea
                label="Tag import JSON"
                name="tagBulkImportJson"
                onChange={(event) => handleBulkImportInputChange(event.target.value)}
                placeholder={`[\n  {\n    "name": "summer",\n    "aliases": ["beach", "sunny"],\n    "preferredWhen": "Use for warm weather, vacation, and seasonal summer designs."\n  }\n]`}
                ref={bulkImportTextareaRef}
                value={bulkImportInput}
              />

              {bulkImportError ?? bulkImportValidation.error ? (
                <p className="auth-message auth-message-error" role="alert">
                  {bulkImportError ?? bulkImportValidation.error}
                </p>
              ) : null}

              {bulkImportInput.trim() && !bulkImportValidation.error ? (
                <div className="category-bulk-import-preview" ref={bulkImportSummaryRef}>
                  <div className="category-bulk-import-summary">
                    <p className="design-details-muted">
                      Ready to import {bulkImportPreview.length} tag{bulkImportPreview.length === 1 ? "" : "s"}.
                      {bulkImportRejectedItems.length > 0
                        ? ` Rejected ${bulkImportRejectedItems.length} entr${bulkImportRejectedItems.length === 1 ? "y" : "ies"}.`
                        : ""}
                    </p>
                    <Button
                      disabled={isBulkImporting || bulkImportPreview.length === 0}
                      onClick={() => void handleBulkImport()}
                      type="button"
                    >
                      {isBulkImporting ? "Importing tags..." : "Import tags"}
                    </Button>
                  </div>
                  {bulkImportRejectedItems.length > 0 ? (
                    <div className="category-bulk-import-failures">
                      <p className="design-details-muted">Rejected entries:</p>
                      <ul>
                        {bulkImportRejectedItems.map((rejectedItem) => (
                          <li key={`${rejectedItem.index}-${rejectedItem.reason}`}>
                            <strong>
                              Entry {rejectedItem.index + 1}
                              {rejectedItem.name ? ` (${rejectedItem.name})` : ""}
                            </strong>
                            : {rejectedItem.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {bulkImportPreview.length > 0 ? (
                    <div className="category-bulk-import-preview-list" role="list">
                      {bulkImportPreview.map((tag) => (
                        <article className="category-bulk-import-preview-item" key={tag.name} role="listitem">
                          <h4>{tag.name}</h4>
                          <p>{tag.preferredWhen}</p>
                          {tag.aliases.length > 0 ? (
                            <p>Aliases: {tag.aliases.join(", ")}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {bulkImportResult ? (
                <div className="category-bulk-import-results">
                  {bulkImportResult.createdNames.length > 0 ? (
                    <p className="design-details-muted">
                      Created: {bulkImportResult.createdNames.join(", ")}
                    </p>
                  ) : null}
                  {bulkImportResult.failures.length > 0 ? (
                    <div className="category-bulk-import-failures">
                      <p className="design-details-muted">
                        Rejected during import: {bulkImportResult.failures.length}
                      </p>
                      <ul>
                        {bulkImportResult.failures.map((failure) => (
                          <li key={`${failure.name}-${failure.message}`}>
                            <strong>{failure.name}</strong>: {failure.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </ModalBody>

          <ModalFooter>
            <Button disabled={isBulkImporting} onClick={returnToList} type="button" variant="secondary">
              Back
            </Button>
          </ModalFooter>
        </>
      ) : (
        <form className="design-management-form" onSubmit={handleSubmit}>
          <ModalHeader>
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 id="tag-management-title">{formTitle}</h2>
              <p>Tags are global approved metadata. They do not belong to categories.</p>
            </div>

            <button
              aria-label="Close tags"
              className="icon-button icon-button-md icon-button-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.2} />
            </button>
          </ModalHeader>

          <ModalBody>
            <TextInput
              label="Name"
              name="tagName"
              onChange={(event) =>
                setFormValues((currentValues) => ({
                  ...currentValues,
                  name: event.target.value,
                }))
              }
              required
              value={formValues.name}
            />

            <CatalogAliasChipInput
              label="Aliases"
              name="tagAliases"
              onChange={(value) =>
                setFormValues((currentValues) => ({
                  ...currentValues,
                  aliasesInput: value,
                }))
              }
              value={formValues.aliasesInput}
            />

            <AutoResizeTextarea
              label="Preferred when"
              name="tagPreferredWhen"
              onChange={(event) =>
                setFormValues((currentValues) => ({
                  ...currentValues,
                  preferredWhen: event.target.value,
                }))
              }
              required
              value={formValues.preferredWhen}
            />

            {actionError ? (
              <p className="auth-message auth-message-error" role="alert">
                {actionError}
              </p>
            ) : null}
          </ModalBody>

          <ModalFooter>
            <Button disabled={isSubmitting} onClick={returnToList} type="button" variant="secondary">
              Back
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? editorMode === "create"
                  ? "Creating tag..."
                  : "Saving tag..."
                : editorMode === "create"
                  ? "Create tag"
                  : "Save changes"}
            </Button>
          </ModalFooter>
        </form>
      )}

      {tagToArchive ? (
        <div className="design-library-confirm-overlay" role="presentation">
          <div
            aria-labelledby="archive-tag-confirm-title"
            aria-modal="true"
            className="design-library-confirm-dialog"
            role="dialog"
          >
            <h3 id="archive-tag-confirm-title">Archive tag?</h3>
            <p>
              Archive {tagToArchive.name}? Existing design tag strings stay unchanged, but this
              tag will no longer be used as an approved AI match.
            </p>
            <div className="design-library-confirm-actions">
              <Button disabled={isSubmitting} onClick={() => setTagToArchive(null)} variant="secondary">
                Cancel
              </Button>
              <Button disabled={isSubmitting} onClick={() => void handleArchiveConfirm()} variant="danger">
                {isSubmitting ? "Archiving..." : "Archive tag"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DesignLibraryModal>
  );
}
