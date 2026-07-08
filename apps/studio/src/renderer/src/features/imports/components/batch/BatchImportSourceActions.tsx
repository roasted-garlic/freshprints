import { FileArchive, FileImage, FolderOpen } from "lucide-react";

import { Button } from "../../../../shared/components/Button";

interface BatchImportSourceActionsProps {
  disabled?: boolean;
  isBusy: boolean;
  onSelectFolder: () => void;
  onSelectMultiplePngs: () => void;
  onSelectZip: () => void;
}

export function BatchImportSourceActions({
  disabled = false,
  isBusy,
  onSelectFolder,
  onSelectMultiplePngs,
  onSelectZip,
}: BatchImportSourceActionsProps) {
  const isDisabled = disabled || isBusy;

  return (
    <div className="batch-import-source-actions">
      <Button
        className="button-leading-icon"
        disabled={isDisabled}
        onClick={onSelectMultiplePngs}
        variant="secondary"
      >
        <FileImage aria-hidden="true" size={16} strokeWidth={2} />
        {isBusy ? "Working..." : "Select Images"}
      </Button>

      <Button
        className="button-leading-icon"
        disabled={isDisabled}
        onClick={onSelectFolder}
        variant="secondary"
      >
        <FolderOpen aria-hidden="true" size={16} strokeWidth={2} />
        Select folder
      </Button>

      <Button
        className="button-leading-icon"
        disabled={isDisabled}
        onClick={onSelectZip}
        variant="secondary"
      >
        <FileArchive aria-hidden="true" size={16} strokeWidth={2} />
        Select ZIP
      </Button>
    </div>
  );
}
