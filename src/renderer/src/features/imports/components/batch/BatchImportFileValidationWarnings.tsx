import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";

import { getImportWarningMessageClassName } from "../../utils/importPrintSizeDisplay";

interface BatchImportFileValidationWarningsProps {
  warnings: ImportPngWarning[];
}

function getWarningPrefix(code: ImportPngWarning["code"]): string {
  if (code === "PRINT_SIZE_NORMALIZED" || code === "IMAGE_UPSCALED") {
    return "";
  }

  if (code === "PRINT_SIZE_SMALL_FORMAT") {
    return "Small-format: ";
  }

  return "Warning: ";
}

export function BatchImportFileValidationWarnings({
  warnings,
}: BatchImportFileValidationWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  if (warnings.length === 1) {
    const warning = warnings[0];

    return (
      <p className={`batch-import-file-validation-warning ${getImportWarningMessageClassName(warning.code)}`}>
        {getWarningPrefix(warning.code)}
        {warning.message}
      </p>
    );
  }

  return (
    <details className="batch-import-file-validation-warnings">
      <summary>{warnings.length} messages</summary>
      <ul>
        {warnings.map((warning) => (
          <li className={getImportWarningMessageClassName(warning.code)} key={warning.code}>
            {getWarningPrefix(warning.code)}
            {warning.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
