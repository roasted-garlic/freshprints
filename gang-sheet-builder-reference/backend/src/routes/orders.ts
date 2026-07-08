import { Router, type IRouter, type Request, type Response } from "express";
import { db, gangSheetOrdersTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireShopifyAuth } from "../middlewares/requireShopifyAuth";
import type { ProjectData } from "@workspace/db/schema";

const router: IRouter = Router();

/**
 * GET /api/orders
 * List confirmed/fulfilled orders for the logged-in customer (newest first).
 * Pending orders (not yet paid) are hidden from this view.
 */
router.get("/orders", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const orders = await db
      .select({
        id: gangSheetOrdersTable.id,
        shopifyOrderId: gangSheetOrdersTable.shopifyOrderId,
        projectId: gangSheetOrdersTable.projectId,
        canvasWidthIn: gangSheetOrdersTable.canvasWidthIn,
        canvasHeightIn: gangSheetOrdersTable.canvasHeightIn,
        sheetCount: gangSheetOrdersTable.sheetCount,
        imageCount: gangSheetOrdersTable.imageCount,
        totalPrice: gangSheetOrdersTable.totalPrice,
        status: gangSheetOrdersTable.status,
        notes: gangSheetOrdersTable.notes,
        createdAt: gangSheetOrdersTable.createdAt,
        updatedAt: gangSheetOrdersTable.updatedAt,
      })
      .from(gangSheetOrdersTable)
      .where(
        and(
          eq(gangSheetOrdersTable.shopifyCustomerId, customerId),
          inArray(gangSheetOrdersTable.status, ["confirmed", "fulfilled"])
        )
      )
      .orderBy(desc(gangSheetOrdersTable.createdAt));

    res.json({ orders });
  } catch (err) {
    console.error("Error listing orders:", err);
    res.status(500).json({ error: "Failed to list orders" });
  }
});

/**
 * GET /api/orders/:id
 * Get a single order including the full project snapshot
 */
router.get("/orders/:id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const [order] = await db
      .select()
      .from(gangSheetOrdersTable)
      .where(
        and(
          eq(gangSheetOrdersTable.id, id),
          eq(gangSheetOrdersTable.shopifyCustomerId, customerId)
        )
      );

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order });
  } catch (err) {
    console.error("Error getting order:", err);
    res.status(500).json({ error: "Failed to get order" });
  }
});

/**
 * POST /api/orders
 * Create an order record (status=pending) when the customer clicks "Add to Cart".
 * Summary counts are derived from the snapshot and stored for quick display.
 */
router.post("/orders", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const {
      projectSnapshot,
      projectId,
      canvasWidthIn,
      canvasHeightIn,
      totalPrice,
      notes,
    } = req.body as {
      projectSnapshot?: ProjectData;
      projectId?: number;
      canvasWidthIn?: number;
      canvasHeightIn?: number;
      totalPrice?: number;
      notes?: string;
    };

    if (!projectSnapshot || typeof projectSnapshot !== "object") {
      res.status(400).json({ error: "projectSnapshot is required" });
      return;
    }

    // Derive summary counts from the snapshot
    const nonEmptySheets = (projectSnapshot.sheets ?? []).filter(
      (s: unknown[]) => s.length > 0
    );
    const sheetCount = nonEmptySheets.length;
    const imageCount = nonEmptySheets.reduce(
      (sum: number, s: unknown[]) => sum + s.length,
      0
    );

    const [order] = await db
      .insert(gangSheetOrdersTable)
      .values({
        shopifyCustomerId: customerId,
        projectSnapshot,
        projectId: projectId ?? null,
        canvasWidthIn: canvasWidthIn ?? null,
        canvasHeightIn: canvasHeightIn ?? null,
        sheetCount,
        imageCount,
        totalPrice: totalPrice ?? null,
        notes: notes ?? null,
        status: "pending",
      })
      .returning();

    res.status(201).json({ order });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * PATCH /api/orders/:id/shopify-order-id
 * Link a confirmed Shopify order ID to the record (called from webhook or confirmation page).
 */
router.patch("/orders/:id/shopify-order-id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { shopifyOrderId } = req.body as { shopifyOrderId?: string };
    if (!shopifyOrderId || typeof shopifyOrderId !== "string") {
      res.status(400).json({ error: "shopifyOrderId is required" });
      return;
    }

    const [order] = await db
      .update(gangSheetOrdersTable)
      .set({ shopifyOrderId, status: "confirmed", updatedAt: new Date() })
      .where(
        and(
          eq(gangSheetOrdersTable.id, id),
          eq(gangSheetOrdersTable.shopifyCustomerId, customerId)
        )
      )
      .returning();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order });
  } catch (err) {
    console.error("Error updating order shopify ID:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
