import { Router, type IRouter, type Request, type Response } from "express";
import { db, gangSheetLibraryTable, gangSheetProjectsTable, gangSheetOrdersTable } from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { requireShopifyAuth } from "../middlewares/requireShopifyAuth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

const router: IRouter = Router();

/**
 * GET /api/library
 * List all (non-deleted) library images for the logged-in customer
 */
router.get("/library", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const images = await db
      .select()
      .from(gangSheetLibraryTable)
      .where(
        and(
          eq(gangSheetLibraryTable.shopifyCustomerId, customerId),
          isNull(gangSheetLibraryTable.deletedAt)
        )
      )
      .orderBy(desc(gangSheetLibraryTable.createdAt));

    res.json({ images });
  } catch (err) {
    console.error("Error listing library:", err);
    res.status(500).json({ error: "Failed to list library images" });
  }
});

/**
 * POST /api/library
 * Save an image to the library after it has been uploaded to object storage
 */
router.post("/library", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const { name, objectPath, naturalW, naturalH, fileDpi, docWidthIn, docHeightIn } = req.body as {
      name?: string;
      objectPath?: string;
      naturalW?: number;
      naturalH?: number;
      fileDpi?: number;
      docWidthIn?: number;
      docHeightIn?: number;
    };

    if (!name || !objectPath || !naturalW || !naturalH) {
      res.status(400).json({ error: "Missing required fields: name, objectPath, naturalW, naturalH" });
      return;
    }

    const [image] = await db
      .insert(gangSheetLibraryTable)
      .values({
        shopifyCustomerId: customerId,
        name,
        objectPath,
        naturalW,
        naturalH,
        fileDpi: fileDpi ?? 300,
        docWidthIn: docWidthIn ?? null,
        docHeightIn: docHeightIn ?? null,
      })
      .returning();

    res.status(201).json({ image });
  } catch (err) {
    console.error("Error adding to library:", err);
    res.status(500).json({ error: "Failed to add image to library" });
  }
});

/**
 * DELETE /api/library/:id
 * Remove an image from the library:
 *   - Cascade-removes it from any active saved projects.
 *   - If no past order references the image, hard-deletes the GCS object.
 *   - If an order DOES reference it, soft-deletes (sets deletedAt) to preserve
 *     the historical record without showing the image in the library UI.
 */
router.delete("/library/:id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid library image ID" });
      return;
    }

    // 1. Fetch the record first so we have objectPath for cleanup
    const [record] = await db
      .select()
      .from(gangSheetLibraryTable)
      .where(
        and(
          eq(gangSheetLibraryTable.id, id),
          eq(gangSheetLibraryTable.shopifyCustomerId, customerId)
        )
      );

    if (!record) {
      res.status(404).json({ error: "Library image not found" });
      return;
    }

    // 2. Cascade: scrub this image from active saved projects (library list + canvas sheets)
    if (record.objectPath) {
      const projects = await db
        .select()
        .from(gangSheetProjectsTable)
        .where(eq(gangSheetProjectsTable.shopifyCustomerId, customerId));

      for (const project of projects) {
        const data = project.data as any;
        if (!Array.isArray(data?.library)) continue;

        // Find the IDs of project-library entries that reference this objectPath
        const removedIds = new Set<string>(
          data.library
            .filter((img: any) => img.objectPath === record.objectPath)
            .map((img: any) => String(img.id))
        );
        if (removedIds.size === 0) continue;

        const updatedData = {
          ...data,
          // Remove from library panel
          library: data.library.filter((img: any) => img.objectPath !== record.objectPath),
          // Remove canvas items that reference the deleted image
          sheets: Array.isArray(data.sheets)
            ? data.sheets.map((sheet: any[]) =>
                sheet.filter((ci: any) => !removedIds.has(String(ci.imageId)))
              )
            : data.sheets,
        };

        await db
          .update(gangSheetProjectsTable)
          .set({ data: updatedData, updatedAt: new Date() })
          .where(eq(gangSheetProjectsTable.id, project.id));
      }
    }

    // 3. Check if any order snapshot references this objectPath
    const orderReferencesImage = record.objectPath
      ? await (async () => {
          const orders = await db
            .select({ projectSnapshot: gangSheetOrdersTable.projectSnapshot })
            .from(gangSheetOrdersTable)
            .where(eq(gangSheetOrdersTable.shopifyCustomerId, customerId));
          return orders.some((o) => {
            const snap = o.projectSnapshot as any;
            return Array.isArray(snap?.library) && snap.library.some((img: any) => img.objectPath === record.objectPath);
          });
        })()
      : false;

    if (orderReferencesImage) {
      // Soft-delete only — GCS object must survive for order history
      await db
        .update(gangSheetLibraryTable)
        .set({ deletedAt: new Date() })
        .where(eq(gangSheetLibraryTable.id, id));
    } else {
      // Hard-delete from DB then purge from GCS
      await db
        .delete(gangSheetLibraryTable)
        .where(eq(gangSheetLibraryTable.id, id));

      if (record.objectPath) {
        try {
          await objectStorageService.deleteObjectEntity(record.objectPath);
        } catch (err) {
          if (err instanceof ObjectNotFoundError) {
            console.warn(`GCS object already missing: ${record.objectPath}`);
          } else {
            console.error("Failed to delete from GCS:", err);
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting library image:", err);
    res.status(500).json({ error: "Failed to delete library image" });
  }
});

export default router;
