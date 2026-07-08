import { Router, type IRouter, type Request, type Response } from "express";
import { db, gangSheetProjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireShopifyAuth } from "../middlewares/requireShopifyAuth";
import type { ProjectData } from "@workspace/db/schema";

const router: IRouter = Router();

/**
 * GET /api/projects
 * List all named (non-draft) projects for the logged-in customer
 */
router.get("/projects", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const projects = await db
      .select({
        id: gangSheetProjectsTable.id,
        name: gangSheetProjectsTable.name,
        createdAt: gangSheetProjectsTable.createdAt,
        updatedAt: gangSheetProjectsTable.updatedAt,
      })
      .from(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId),
          eq(gangSheetProjectsTable.isDraft, false)
        )
      )
      .orderBy(gangSheetProjectsTable.updatedAt);

    res.json({ projects });
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

/**
 * GET /api/projects/draft
 * Get the current user's unsaved draft project (if any)
 * IMPORTANT: Must be defined before GET /api/projects/:id
 */
router.get("/projects/draft", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const [project] = await db
      .select()
      .from(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId),
          eq(gangSheetProjectsTable.isDraft, true)
        )
      )
      .limit(1);

    res.json({ project: project ?? null });
  } catch (err) {
    console.error("Error getting draft:", err);
    res.status(500).json({ error: "Failed to get draft" });
  }
});

/**
 * PUT /api/projects/draft
 * Upsert the current user's draft project — creates one if it doesn't exist,
 * updates it if it does.
 * IMPORTANT: Must be defined before PUT /api/projects/:id
 */
router.put("/projects/draft", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const { library, sheets, sheetNames } = req.body as {
      library?: ProjectData["library"];
      sheets?: ProjectData["sheets"];
      sheetNames?: ProjectData["sheetNames"];
    };

    const data: ProjectData = {
      library: library ?? [],
      sheets: sheets ?? [[]],
      sheetNames: sheetNames ?? ["Sheet 1"],
    };

    // Check if a draft already exists for this customer
    const [existing] = await db
      .select({ id: gangSheetProjectsTable.id })
      .from(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId),
          eq(gangSheetProjectsTable.isDraft, true)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing draft
      const [updated] = await db
        .update(gangSheetProjectsTable)
        .set({ data, updatedAt: new Date() })
        .where(eq(gangSheetProjectsTable.id, existing.id))
        .returning();
      res.json({ project: updated });
    } else {
      // Create new draft
      const [created] = await db
        .insert(gangSheetProjectsTable)
        .values({
          shopifyCustomerId: customerId,
          name: "__draft__",
          data,
          isDraft: true,
        })
        .returning();
      res.status(201).json({ project: created });
    }
  } catch (err) {
    console.error("Error upserting draft:", err);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

/**
 * DELETE /api/projects/draft
 * Clear the current user's draft project
 * IMPORTANT: Must be defined before DELETE /api/projects/:id
 */
router.delete("/projects/draft", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    await db
      .delete(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId),
          eq(gangSheetProjectsTable.isDraft, true)
        )
      );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting draft:", err);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
router.get("/projects/:id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [project] = await db
      .select()
      .from(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.id, id),
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId)
        )
      );

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (err) {
    console.error("Error getting project:", err);
    res.status(500).json({ error: "Failed to get project" });
  }
});

/**
 * POST /api/projects
 * Create a new named project (also deletes any existing draft)
 */
router.post("/projects", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const { name, data } = req.body as { name?: string; data?: ProjectData };

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }

    if (!data || typeof data !== "object") {
      res.status(400).json({ error: "Project data is required" });
      return;
    }

    // Delete any existing draft now that user is explicitly saving
    await db
      .delete(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId),
          eq(gangSheetProjectsTable.isDraft, true)
        )
      );

    const [project] = await db
      .insert(gangSheetProjectsTable)
      .values({
        shopifyCustomerId: customerId,
        name: name.trim(),
        data,
        isDraft: false,
      })
      .returning();

    res.status(201).json({ project });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

/**
 * PUT /api/projects/:id
 * Update an existing project
 */
router.put("/projects/:id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const { name, data } = req.body as { name?: string; data?: ProjectData };

    const updates: Partial<{
      name: string;
      data: ProjectData;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (name && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (data && typeof data === "object") {
      updates.data = data;
    }

    const [project] = await db
      .update(gangSheetProjectsTable)
      .set(updates)
      .where(
        and(
          eq(gangSheetProjectsTable.id, id),
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId)
        )
      )
      .returning();

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete("/projects/:id", requireShopifyAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.shopifyCustomerId!;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [deleted] = await db
      .delete(gangSheetProjectsTable)
      .where(
        and(
          eq(gangSheetProjectsTable.id, id),
          eq(gangSheetProjectsTable.shopifyCustomerId, customerId)
        )
      )
      .returning({ id: gangSheetProjectsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
