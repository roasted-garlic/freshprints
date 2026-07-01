import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { SelectOption } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Category } from "../types/category.types";
import type { Design } from "../types/design.types";
import { useUpdateDesign } from "../hooks/useUpdateDesign";
import type { DesignFormValues } from "../types/designForm.types";
import { emptyDesignFormValues } from "../types/designForm.types";
import { buildEditDesignUpdateInput, mapDesignToFormValues } from "../utils/designFormMapper";
import { DesignFormFields } from "./DesignFormFields";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface EditDesignModalProps {
  approvedTags: CatalogTag[];
  categories: Category[];
  design: Design | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

export function EditDesignModal({
  approvedTags,
  categories,
  design,
  isOpen,
  onClose,
  onUpdated,
}: EditDesignModalProps) {
  const { user } = useAuth();
  const { clearError, error, isSubmitting, updateDesign } = useUpdateDesign();
  const [formValues, setFormValues] = useState<DesignFormValues>(emptyDesignFormValues);

  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { label: "No category", value: "" },
      ...categories
        .filter((category) => category.isActive || category.id === design?.categoryId)
        .map((category) => ({ label: category.name, value: category.id })),
    ],
    [categories, design?.categoryId],
  );

  useEffect(() => {
    if (!isOpen || !design) {
      return;
    }

    setFormValues(mapDesignToFormValues(design));
    clearError();
  }, [clearError, design, isOpen]);

  if (!user || !design || !permissionService.canEditDesigns(user)) {
    return null;
  }

  function handleFieldChange(field: keyof DesignFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function handlePrintSettingsChange(updates: Partial<DesignFormValues>) {
    setFormValues((currentValues) => ({
      ...currentValues,
      ...updates,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    try {
      await updateDesign(design!.id, buildEditDesignUpdateInput(design!, formValues));
      await onUpdated();
      onClose();
    } catch {
      // Error handled in hook.
    }
  }

  return (
    <DesignLibraryModal ariaLabelledBy="edit-design-title" isOpen={isOpen} onClose={onClose}>
      <form className="design-management-form" onSubmit={handleSubmit}>
        <ModalHeader>
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 id="edit-design-title">Edit design</h2>
            <p>Update catalog metadata for {design.title}.</p>
          </div>
        </ModalHeader>

        <ModalBody>
          <DesignFormFields
            approvedTags={approvedTags}
            categoryOptions={categoryOptions}
            designId={design.id}
            error={error}
            formValues={formValues}
            isArchived={design.status === "archived"}
            onChange={handleFieldChange}
            onPrintSettingsChange={handlePrintSettingsChange}
          />
        </ModalBody>

        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving design..." : "Save changes"}
          </Button>
        </ModalFooter>
      </form>
    </DesignLibraryModal>
  );
}
