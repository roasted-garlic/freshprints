import { pgTable, serial, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { ProjectData } from "./gangSheetProjects";

export const gangSheetOrdersTable = pgTable("gang_sheet_orders", {
  id: serial("id").primaryKey(),
  shopifyCustomerId: text("shopify_customer_id").notNull(),
  shopifyOrderId: text("shopify_order_id"),
  projectId: integer("project_id"),
  projectSnapshot: jsonb("project_snapshot").$type<ProjectData>().notNull(),
  canvasWidthIn: real("canvas_width_in"),
  canvasHeightIn: real("canvas_height_in"),
  sheetCount: integer("sheet_count"),
  imageCount: integer("image_count"),
  totalPrice: real("total_price"),
  printFileUrl: text("print_file_url"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GangSheetOrder = typeof gangSheetOrdersTable.$inferSelect;
