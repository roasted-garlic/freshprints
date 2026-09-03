import { useMemo } from "react";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";
import type { Design } from "../../designs/types/design.types";
import { resolvePrintRequestItemArtworkBackground } from "../utils/resolvePrintRequestItemArtworkBackground";
import type { PrintRequestItemUploadSummary } from "./PrintRequestItemCard";

function resolveItemTitle(
  item: PrintRequestItem,
  design: Design | undefined,
  upload: PrintRequestItemUploadSummary | null | undefined,
): string {
  const isUploadItem = item.sourceType === "customer_upload" || Boolean(item.customerUploadId);
  return (
    design?.title ??
    upload?.title ??
    item.titleSnapshot ??
    (isUploadItem ? "Uploaded artwork" : item.designId ?? "Design")
  );
}

function resolveItemPreviewPath(
  design: Design | undefined,
  upload: PrintRequestItemUploadSummary | null | undefined,
): string | undefined {
  return (
    design?.previewPath ??
    design?.thumbnailPath ??
    upload?.previewPath ??
    upload?.thumbnailPath ??
    undefined
  );
}

interface PrintRequestItemsPreviewLightboxProps {
  activeItemId: string | null;
  designById: Map<string, Design>;
  items: readonly PrintRequestItem[];
  onActiveItemChange: (itemId: string) => void;
  onClose: () => void;
  resolveUpload: (item: PrintRequestItem) => PrintRequestItemUploadSummary | null;
}

/**
 * Page-owned lightbox for print-request line items.
 * Stable navigation id is always `item.id` (never designId alone).
 */
export function PrintRequestItemsPreviewLightbox({
  activeItemId,
  designById,
  items,
  onActiveItemChange,
  onClose,
  resolveUpload,
}: PrintRequestItemsPreviewLightboxProps) {
  const navigationEntries = useMemo(() => {
    return items.flatMap((item) => {
      const design = item.designId ? designById.get(item.designId) : undefined;
      const upload = resolveUpload(item);
      const previewPath = resolveItemPreviewPath(design, upload);
      if (!previewPath?.trim()) {
        return [];
      }
      return [
        {
          id: item.id,
          alt: `${resolveItemTitle(item, design, upload)} preview`,
          artworkBackgroundHex: resolvePrintRequestItemArtworkBackground(design),
          previewPath,
        },
      ];
    });
  }, [designById, items, resolveUpload]);

  const activeEntry =
    activeItemId != null ? navigationEntries.find((entry) => entry.id === activeItemId) : undefined;

  const { url: previewUrl } = useDesignDerivativeUrl(activeEntry?.previewPath);

  const navigationItems =
    navigationEntries.length > 1
      ? navigationEntries.map(({ id, alt, artworkBackgroundHex }) => ({
          id,
          alt,
          artworkBackgroundHex,
        }))
      : undefined;

  function handleCloseWithFinalItemId(finalItemId: string | null) {
    onClose();
    if (!finalItemId) {
      return;
    }
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-print-request-item-id="${CSS.escape(finalItemId)}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <DesignPreviewLightbox
      activeItemId={activeItemId}
      alt={activeEntry?.alt ?? "Item preview"}
      artworkBackgroundHex={activeEntry?.artworkBackgroundHex}
      isOpen={Boolean(activeItemId && activeEntry)}
      navigationItems={navigationItems}
      onActiveItemChange={onActiveItemChange}
      onClose={onClose}
      onCloseWithFinalItemId={handleCloseWithFinalItemId}
      previewUrl={previewUrl ?? null}
    />
  );
}
