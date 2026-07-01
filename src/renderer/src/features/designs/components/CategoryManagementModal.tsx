import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";

import { ArchivedToolbarButton, BackToolbarButton } from "../../../shared/components/ArchivedToolbarButton";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useArchiveCategory } from "../hooks/useArchiveCategory";
import { useCreateCategory } from "../hooks/useCreateCategory";
import { useReorderCategory } from "../hooks/useReorderCategory";
import { useRestoreCategory } from "../hooks/useRestoreCategory";
import { useUpdateCategory } from "../hooks/useUpdateCategory";
import type { Category } from "../types/category.types";
import {
  emptyCategoryFormValues,
  type CategoryFormValues,
} from "../types/designForm.types";
import { parseBulkCategoryJson, type BulkCategoryImportItem } from "../utils/bulkCategoryImport";
import { moveCategoryRelative, normalizeCategoryOrder, type CategoryDropPosition } from "../utils/categoryOrder";
import { ArchiveCategoryConfirmDialog } from "./ArchiveCategoryConfirmDialog";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface CategoryManagementModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

type CategoryEditorMode = "list" | "create" | "edit" | "bulk-import";

interface BulkImportResult {
  createdNames: string[];
  failures: Array<{ name: string; message: string }>;
}

const CATEGORY_DESCRIPTION_PREVIEW_LENGTH = 180;

function parseSortOrder(value: string): number {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error("Sort order must be a valid number.");
  }

  return parsedValue;
}

function mapCategoryToFormValues(category: Category): CategoryFormValues {
  return {
    name: category.name,
    description: category.description ?? "",
    sortOrder: String(category.sortOrder),
  };
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function getDropPosition(event: DragEvent<HTMLElement>): CategoryDropPosition {
  const { top, height } = event.currentTarget.getBoundingClientRect();
  return event.clientY - top > height / 2 ? "after" : "before";
}

function shouldOfferCategoryDescriptionExpansion(description: string): boolean {
  return description.length > CATEGORY_DESCRIPTION_PREVIEW_LENGTH;
}

export function CategoryManagementModal({
  categories,
  isOpen,
  onClose,
  onUpdated,
}: CategoryManagementModalProps) {
  const { user } = useAuth();
  const isOwner = permissionService.isOwner(user);
  const canManageCategories = permissionService.canManageCategories(user);

  const { clearError: clearCreateError, createCategory, error: createError, isSubmitting: isCreating } =
    useCreateCategory();
  const { clearError: clearUpdateError, error: updateError, isSubmitting: isUpdating, updateCategory } =
    useUpdateCategory();
  const {
    archiveCategory,
    clearError: clearArchiveError,
    error: archiveError,
    isSubmitting: isArchiving,
  } = useArchiveCategory();
  const {
    clearError: clearRestoreError,
    error: restoreError,
    isSubmitting: isRestoring,
    restoreCategory,
  } = useRestoreCategory();
  const {
    clearError: clearReorderError,
    error: reorderError,
    isSubmitting: isReordering,
    reorderCategory,
  } = useReorderCategory();

  const [editorMode, setEditorMode] = useState<CategoryEditorMode>("list");
  const [showArchived, setShowArchived] = useState(false);
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyCategoryFormValues);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);
  const [restoringCategoryId, setRestoringCategoryId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<CategoryDropPosition>("before");
  const [dragPreviewCategories, setDragPreviewCategories] = useState<Category[] | null>(null);
  const [bulkImportInput, setBulkImportInput] = useState("");
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [expandedCategoryDescriptions, setExpandedCategoryDescriptions] = useState<Set<string>>(
    () => new Set(),
  );
  const bulkImportTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bulkImportSummaryRef = useRef<HTMLDivElement | null>(null);

  const activeCategories = useMemo(
    () => normalizeCategoryOrder(categories.filter((category) => category.isActive)),
    [categories],
  );
  const archivedCategories = useMemo(
    () => sortCategories(categories.filter((category) => !category.isActive)),
    [categories],
  );

  const visibleCategories = useMemo(() => {
    if (showArchived) {
      return archivedCategories;
    }

    return dragPreviewCategories ?? activeCategories;
  }, [activeCategories, archivedCategories, dragPreviewCategories, showArchived]);

  const formError = createError ?? updateError;
  const listError = archiveError ?? restoreError ?? reorderError;
  const isMutatingCategories =
    isCreating || isUpdating || isArchiving || isRestoring || isReordering || isBulkImporting;
  const bulkImportValidation = useMemo<{ error: string | null; preview: BulkCategoryImportItem[] | null }>(() => {
    if (editorMode !== "bulk-import" || !bulkImportInput.trim()) {
      return { error: null, preview: null };
    }

    try {
      return {
        error: null,
        preview: parseBulkCategoryJson(bulkImportInput),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to parse category import JSON.",
        preview: null,
      };
    }
  }, [bulkImportInput, editorMode]);
  const bulkImportPreview = bulkImportValidation.preview;
  const categoryCount = showArchived ? archivedCategories.length : activeCategories.length;
  const categoryCountLabel = `${categoryCount} ${showArchived ? "archived" : "active"} ${
    categoryCount === 1 ? "category" : "categories"
  }`;

  const resetDragState = useCallback(() => {
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
    setDragOverPosition("before");
    setDragPreviewCategories(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEditorMode("list");
    setShowArchived(false);
    setFormValues(emptyCategoryFormValues);
    setEditingCategory(null);
    setCategoryToArchive(null);
    setRestoringCategoryId(null);
    setSuccessMessage(null);
    resetDragState();
    setBulkImportInput("");
    setBulkImportError(null);
    setBulkImportResult(null);
    setExpandedCategoryDescriptions(new Set());
    clearCreateError();
    clearUpdateError();
    clearArchiveError();
    clearRestoreError();
    clearReorderError();
  }, [
    clearArchiveError,
    clearCreateError,
    clearReorderError,
    clearRestoreError,
    clearUpdateError,
    isOpen,
    resetDragState,
  ]);

  useEffect(() => {
    if (showArchived) {
      resetDragState();
    }
  }, [resetDragState, showArchived]);

  useEffect(() => {
    if (editorMode === "bulk-import" && bulkImportPreview) {
      scrollBulkImportSummaryIntoView();
    }
  }, [bulkImportPreview, editorMode]);

  if (!user || !permissionService.canViewDesigns(user)) {
    return null;
  }

  function openCreateForm() {
    clearCreateError();
    clearUpdateError();
    clearReorderError();
    setSuccessMessage(null);
    setBulkImportError(null);
    setBulkImportResult(null);
    setEditingCategory(null);
    setFormValues(emptyCategoryFormValues);
    setEditorMode("create");
  }

  function openEditForm(category: Category) {
    clearCreateError();
    clearUpdateError();
    clearReorderError();
    setSuccessMessage(null);
    setBulkImportError(null);
    setBulkImportResult(null);
    setEditingCategory(category);
    setFormValues(mapCategoryToFormValues(category));
    setEditorMode("edit");
  }

  function returnToList() {
    clearCreateError();
    clearUpdateError();
    setBulkImportError(null);
    setEditingCategory(null);
    setFormValues(emptyCategoryFormValues);
    setEditorMode("list");
  }

  function openBulkImport() {
    if (isMutatingCategories) {
      return;
    }

    clearCreateError();
    clearReorderError();
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

  function toggleCategoryDescription(categoryId: string) {
    setExpandedCategoryDescriptions((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(categoryId)) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }

      return nextIds;
    });
  }

  async function handleBulkImport() {
    clearCreateError();
    setBulkImportError(null);
    setBulkImportResult(null);
    setSuccessMessage(null);

    let parsedCategories: BulkCategoryImportItem[];

    try {
      parsedCategories = parseBulkCategoryJson(bulkImportInput);
    } catch (error) {
      setBulkImportError(error instanceof Error ? error.message : "Unable to parse category import JSON.");
      return;
    }

    setIsBulkImporting(true);

    const result: BulkImportResult = {
      createdNames: [],
      failures: [],
    };

    try {
      for (const category of parsedCategories) {
        try {
          await createCategory({
            name: category.name,
            description: category.description,
          });
          result.createdNames.push(category.name);
        } catch (error) {
          result.failures.push({
            name: category.name,
            message: error instanceof Error ? error.message : "Unable to create this category.",
          });
        }
      }

      await onUpdated();
      setBulkImportResult(result);

      if (result.createdNames.length > 0 && result.failures.length === 0) {
        setSuccessMessage(`Imported ${result.createdNames.length} categories successfully.`);
        setBulkImportInput("");
      } else if (result.createdNames.length > 0) {
        setSuccessMessage(
          `Imported ${result.createdNames.length} categories. ${result.failures.length} failed.`,
        );
      } else {
        setBulkImportError("No categories were imported.");
      }
    } finally {
      setIsBulkImporting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearCreateError();
    clearUpdateError();

    try {
      const description = formValues.description.trim() || undefined;

      if (editorMode === "create") {
        await createCategory({
          name: formValues.name,
          description,
        });
        setSuccessMessage("Category created successfully.");
      } else if (editorMode === "edit" && editingCategory) {
        const updateInput =
          editingCategory.isActive
            ? {
                name: formValues.name,
                description: formValues.description,
                sortOrder: parseSortOrder(formValues.sortOrder),
              }
            : {
                name: formValues.name,
                description: formValues.description,
              };

        await updateCategory(editingCategory.id, {
          ...updateInput,
        });
        setSuccessMessage("Category updated successfully.");
      }

      await onUpdated();
      returnToList();
    } catch {
      // Error handled in hook.
    }
  }

  async function handleArchiveConfirm() {
    if (!categoryToArchive) {
      return;
    }

    clearArchiveError();

    try {
      await archiveCategory(categoryToArchive.id);
      await onUpdated();
      setCategoryToArchive(null);
      setSuccessMessage(`${categoryToArchive.name} archived successfully.`);
    } catch {
      // Error handled in hook.
    }
  }

  async function handleRestore(category: Category) {
    clearRestoreError();
    setRestoringCategoryId(category.id);

    try {
      await restoreCategory(category.id);
      await onUpdated();
      setSuccessMessage(`${category.name} restored to the end of the active list.`);
    } catch {
      // Error handled in hook.
    } finally {
      setRestoringCategoryId(null);
    }
  }

  function handleCategoryDragStart(event: DragEvent<HTMLElement>, categoryId: string) {
    if (!canManageCategories || showArchived || isMutatingCategories) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
    clearReorderError();
    setSuccessMessage(null);
    setDraggingCategoryId(categoryId);
    setDragPreviewCategories(activeCategories);
  }

  function handleCategoryDragOver(event: DragEvent<HTMLElement>, targetCategoryId: string) {
    if (!draggingCategoryId || showArchived) {
      return;
    }

    event.preventDefault();

    const position = getDropPosition(event);
    setDragOverCategoryId(targetCategoryId);
    setDragOverPosition(position);

    if (targetCategoryId === draggingCategoryId) {
      return;
    }

    setDragPreviewCategories((currentPreview) => {
      const baseCategories = currentPreview ?? activeCategories;

      try {
        return moveCategoryRelative(baseCategories, draggingCategoryId, targetCategoryId, position);
      } catch {
        return baseCategories;
      }
    });
  }

  async function handleCategoryDrop(event: DragEvent<HTMLElement>, targetCategoryId: string) {
    if (!draggingCategoryId || showArchived) {
      return;
    }

    event.preventDefault();

    const position = getDropPosition(event);
    const baseCategories = dragPreviewCategories ?? activeCategories;

    try {
      const reorderedCategories =
        targetCategoryId === draggingCategoryId
          ? baseCategories
          : moveCategoryRelative(baseCategories, draggingCategoryId, targetCategoryId, position);
      const targetOrder = reorderedCategories.findIndex(
        (category) => category.id === draggingCategoryId,
      );

      if (targetOrder === -1) {
        throw new Error("Unable to determine the dropped category order.");
      }

      await reorderCategory(draggingCategoryId, targetOrder);
      await onUpdated();
      setSuccessMessage("Category order updated successfully.");
    } catch {
      // Error handled in hook.
    } finally {
      resetDragState();
    }
  }

  const isSubmittingForm = isCreating || isUpdating;

  return (
    <>
      <DesignLibraryModal
        ariaLabelledBy="category-management-title"
        isOpen={isOpen}
        onClose={onClose}
      >
        {editorMode === "list" ? (
          <>
            <ModalHeader>
              <div>
                <p className="eyebrow">Catalog</p>
                <h2 id="category-management-title">Categories</h2>
                <p>
                  {canManageCategories
                    ? "Create, edit, and archive design categories."
                    : "View available categories. Category changes require owner or admin access."}
                </p>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="category-management-toolbar">
                {showArchived ? (
                  <BackToolbarButton onClick={() => setShowArchived(false)} />
                ) : (
                  <ArchivedToolbarButton onClick={() => setShowArchived(true)} />
                )}

                {canManageCategories && !showArchived ? (
                  <div className="category-management-toolbar-actions">
                    {isOwner ? (
                      <Button onClick={openBulkImport} type="button" variant="secondary">
                        Bulk import
                      </Button>
                    ) : null}
                    <Button onClick={openCreateForm} type="button">
                      Add category
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="category-management-count-row" aria-live="polite">
                <span className="design-library-count-chip">{categoryCountLabel}</span>
              </div>

              {listError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {listError}
                </p>
              ) : null}

              {successMessage ? (
                <DismissibleSuccessAlert message={successMessage} onDismiss={() => setSuccessMessage(null)} />
              ) : null}

              {!showArchived && canManageCategories ? (
                <p className="design-details-muted">
                  Drag active categories to reorder them. Active category order always resequences to
                  contiguous values starting at 0.
                </p>
              ) : null}

              <div className="category-management-list" role="list">
                {visibleCategories.length === 0 ? (
                  <p className="design-details-muted">
                    {showArchived ? "No archived categories." : "No active categories yet."}
                  </p>
                ) : (
                  visibleCategories.map((category) => {
                    const description = category.description?.trim() ?? "";
                    const descriptionId = `category-description-${category.id}`;
                    const isDescriptionExpanded = expandedCategoryDescriptions.has(category.id);
                    const canExpandDescription = shouldOfferCategoryDescriptionExpansion(description);

                    return (
                      <article
                        className={[
                          "category-management-item",
                          canManageCategories && category.isActive && !showArchived
                            ? "category-management-item-draggable"
                            : "",
                          draggingCategoryId === category.id ? "category-management-item-dragging" : "",
                          dragOverCategoryId === category.id && draggingCategoryId !== category.id
                            ? dragOverPosition === "after"
                              ? "category-management-item-drop-after"
                              : "category-management-item-drop-before"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        draggable={
                          canManageCategories && category.isActive && !showArchived && !isMutatingCategories
                        }
                        key={category.id}
                        onDragEnd={resetDragState}
                        onDragOver={(event) => handleCategoryDragOver(event, category.id)}
                        onDragStart={(event) => handleCategoryDragStart(event, category.id)}
                        onDrop={(event) => void handleCategoryDrop(event, category.id)}
                        role="listitem"
                      >
                        <div className="category-management-item-copy">
                          <div className="category-management-item-header">
                            {canManageCategories && category.isActive && !showArchived ? (
                              <span
                                aria-hidden="true"
                                className="category-management-drag-handle"
                                title="Drag to reorder"
                              >
                                <GripVertical size={16} />
                              </span>
                            ) : null}
                            <h3>{category.name}</h3>
                            <Badge variant={category.isActive ? "success" : "default"}>
                              {category.isActive ? "Active" : "Archived"}
                            </Badge>
                          </div>
                          <div className="category-management-field-row">
                            <span className="category-management-order-chip">
                              Order {category.sortOrder}
                            </span>
                          </div>
                          {description ? (
                            <div className="category-management-text-block">
                              <span className="category-management-field-label">Description</span>
                              <p
                                className={[
                                  "category-management-item-detail",
                                  isDescriptionExpanded ? "category-management-item-detail-expanded" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                id={descriptionId}
                              >
                                {description}
                              </p>
                              {canExpandDescription ? (
                                <Button
                                  aria-controls={descriptionId}
                                  aria-expanded={isDescriptionExpanded}
                                  className="category-management-text-toggle"
                                  onClick={() => toggleCategoryDescription(category.id)}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  {isDescriptionExpanded ? "Show less" : "Show all"}
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {canManageCategories ? (
                          <div className="category-management-item-actions">
                            {category.isActive ? (
                              <>
                                <Button onClick={() => openEditForm(category)} type="button" variant="secondary">
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => {
                                    clearArchiveError();
                                    setCategoryToArchive(category);
                                  }}
                                  type="button"
                                  variant="danger"
                                >
                                  Archive
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button onClick={() => openEditForm(category)} type="button" variant="secondary">
                                  Edit
                                </Button>
                                <Button
                                  disabled={isRestoring && restoringCategoryId === category.id}
                                  onClick={() => void handleRestore(category)}
                                  type="button"
                                >
                                  {isRestoring && restoringCategoryId === category.id
                                    ? "Restoring..."
                                    : "Restore"}
                                </Button>
                              </>
                            )}
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
                <h2 id="category-management-title">Bulk import categories</h2>
                <p>Paste a JSON array of objects with `name` and `description` only.</p>
              </div>
            </ModalHeader>

            <ModalBody>
              <section className="category-bulk-import-panel category-bulk-import-panel-modal">
                <AutoResizeTextarea
                  label="Category import JSON"
                  name="categoryBulkImportJson"
                  onChange={(event) => handleBulkImportInputChange(event.target.value)}
                  placeholder={`[\n  {\n    "name": "Occasions",\n    "description": "Use for life events and celebration designs."\n  }\n]`}
                  ref={bulkImportTextareaRef}
                  value={bulkImportInput}
                />

                {bulkImportError ?? bulkImportValidation.error ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {bulkImportError ?? bulkImportValidation.error}
                  </p>
                ) : null}

                {bulkImportPreview ? (
                  <div className="category-bulk-import-preview" ref={bulkImportSummaryRef}>
                    <div className="category-bulk-import-summary">
                      <p className="design-details-muted">
                        Ready to import {bulkImportPreview.length} categor{bulkImportPreview.length === 1 ? "y" : "ies"}.
                      </p>
                      <Button
                        disabled={isBulkImporting || bulkImportPreview.length === 0}
                        onClick={() => void handleBulkImport()}
                        type="button"
                      >
                        {isBulkImporting ? "Importing categories..." : "Import categories"}
                      </Button>
                    </div>
                    <div className="category-bulk-import-preview-list" role="list">
                      {bulkImportPreview.map((category) => (
                        <article className="category-bulk-import-preview-item" key={category.name} role="listitem">
                          <h4>{category.name}</h4>
                          <p>{category.description}</p>
                        </article>
                      ))}
                    </div>
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
                        <p className="design-details-muted">Failed imports:</p>
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
                <h2 id="category-management-title">
                  {editorMode === "create"
                    ? "Add category"
                    : editingCategory?.isActive === false
                      ? "Edit archived category"
                      : "Edit category"}
                </h2>
                {editorMode === "edit" && editingCategory?.isActive === false ? (
                  <p>Changes apply to the category record. Designs linked by category ID will show the updated name.</p>
                ) : null}
              </div>
            </ModalHeader>

            <ModalBody>
              <TextInput
                label="Name"
                name="categoryName"
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    name: event.target.value,
                  }))
                }
                required
                value={formValues.name}
              />

              <AutoResizeTextarea
                label="Description"
                name="categoryDescription"
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    description: event.target.value,
                  }))
                }
                value={formValues.description}
              />

              {editorMode === "create" ? (
                <p className="design-details-muted">
                  Sort order is assigned automatically to the next available active position.
                </p>
              ) : editingCategory?.isActive ? (
                <TextInput
                  label="Sort order"
                  name="categorySortOrder"
                  onChange={(event) =>
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      sortOrder: event.target.value,
                    }))
                  }
                  type="number"
                  value={formValues.sortOrder}
                />
              ) : (
                <p className="design-details-muted">
                  Archived categories return to the end of the active list when restored.
                </p>
              )}

              {formError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </ModalBody>

            <ModalFooter>
              <Button disabled={isSubmittingForm} onClick={returnToList} type="button" variant="secondary">
                Back
              </Button>
              <Button disabled={isSubmittingForm} type="submit">
                {isSubmittingForm
                  ? editorMode === "create"
                    ? "Creating category..."
                    : "Saving category..."
                  : editorMode === "create"
                    ? "Create category"
                    : "Save changes"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </DesignLibraryModal>

      <ArchiveCategoryConfirmDialog
        category={categoryToArchive}
        error={archiveError}
        isOpen={categoryToArchive !== null}
        isSubmitting={isArchiving}
        onCancel={() => {
          clearArchiveError();
          setCategoryToArchive(null);
        }}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
