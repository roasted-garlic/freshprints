import { useEffect, useMemo, useState, type FormEvent } from "react";

import { ArchivedToolbarButton, BackToolbarButton } from "../../../shared/components/ArchivedToolbarButton";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useArchiveCategory } from "../hooks/useArchiveCategory";
import { useCreateCategory } from "../hooks/useCreateCategory";
import { useRestoreCategory } from "../hooks/useRestoreCategory";
import { useUpdateCategory } from "../hooks/useUpdateCategory";
import type { Category } from "../types/category.types";
import {
  emptyCategoryFormValues,
  type CategoryFormValues,
} from "../types/designForm.types";
import { ArchiveCategoryConfirmDialog } from "./ArchiveCategoryConfirmDialog";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface CategoryManagementModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

type CategoryEditorMode = "list" | "create" | "edit";

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

export function CategoryManagementModal({
  categories,
  isOpen,
  onClose,
  onUpdated,
}: CategoryManagementModalProps) {
  const { user } = useAuth();
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

  const [editorMode, setEditorMode] = useState<CategoryEditorMode>("list");
  const [showArchived, setShowArchived] = useState(false);
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyCategoryFormValues);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);
  const [restoringCategoryId, setRestoringCategoryId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    const filteredCategories = categories.filter((category) =>
      showArchived ? !category.isActive : category.isActive,
    );

    return sortCategories(filteredCategories);
  }, [categories, showArchived]);

  const formError = createError ?? updateError;

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
    clearCreateError();
    clearUpdateError();
    clearArchiveError();
    clearRestoreError();
  }, [clearArchiveError, clearCreateError, clearRestoreError, clearUpdateError, isOpen]);

  if (!user || !permissionService.canViewDesigns(user)) {
    return null;
  }

  function openCreateForm() {
    clearCreateError();
    clearUpdateError();
    setSuccessMessage(null);
    setEditingCategory(null);
    setFormValues(emptyCategoryFormValues);
    setEditorMode("create");
  }

  function openEditForm(category: Category) {
    clearCreateError();
    clearUpdateError();
    setSuccessMessage(null);
    setEditingCategory(category);
    setFormValues(mapCategoryToFormValues(category));
    setEditorMode("edit");
  }

  function returnToList() {
    clearCreateError();
    clearUpdateError();
    setEditingCategory(null);
    setFormValues(emptyCategoryFormValues);
    setEditorMode("list");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearCreateError();
    clearUpdateError();

    try {
      const sortOrder = parseSortOrder(formValues.sortOrder);
      const description = formValues.description.trim() || undefined;

      if (editorMode === "create") {
        await createCategory({
          name: formValues.name,
          description,
          sortOrder,
        });
        setSuccessMessage("Category created successfully.");
      } else if (editorMode === "edit" && editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formValues.name,
          description: formValues.description,
          sortOrder,
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
      setSuccessMessage(`${category.name} restored successfully.`);
    } catch {
      // Error handled in hook.
    } finally {
      setRestoringCategoryId(null);
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
                  <Button onClick={openCreateForm} type="button">
                    Add category
                  </Button>
                ) : null}
              </div>

              {restoreError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {restoreError}
                </p>
              ) : null}

              {successMessage ? (
                <p className="auth-message auth-message-success" role="status">
                  {successMessage}
                </p>
              ) : null}

              <div className="category-management-list" role="list">
                {visibleCategories.length === 0 ? (
                  <p className="design-details-muted">
                    {showArchived ? "No archived categories." : "No active categories yet."}
                  </p>
                ) : (
                  visibleCategories.map((category) => (
                    <article className="category-management-item" key={category.id} role="listitem">
                      <div className="category-management-item-copy">
                        <div className="category-management-item-header">
                          <h3>{category.name}</h3>
                          <Badge variant={category.isActive ? "success" : "default"}>
                            {category.isActive ? "Active" : "Archived"}
                          </Badge>
                        </div>
                        <p className="category-management-item-meta">
                          Sort order {category.sortOrder}
                          {category.description ? ` · ${category.description}` : ""}
                        </p>
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
                  ))
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button onClick={onClose} variant="secondary">
                Close
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

              <TextInput
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
