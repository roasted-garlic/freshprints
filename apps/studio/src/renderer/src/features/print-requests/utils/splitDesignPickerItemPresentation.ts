import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import type { Design } from "../../designs/types/design.types";

export function getSplitPickerDesign(
  item: PrintRequestItem,
  designById?: Map<string, Design>,
): Design | undefined {
  return item.designId ? designById?.get(item.designId) : undefined;
}

export function getSplitPickerItemTitle(
  item: PrintRequestItem,
  designById?: Map<string, Design>,
): string {
  return (
    getSplitPickerDesign(item, designById)?.title ??
    item.titleSnapshot ??
    item.sizeLabel ??
    `Item ${item.id.slice(0, 6)}`
  );
}
