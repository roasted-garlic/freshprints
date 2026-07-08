import { pgTable, serial, text, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export interface ProjectLibraryImage {
  id: string;
  url: string;
  name: string;
  naturalW: number;
  naturalH: number;
  fileDPI: number;
  docWidthIn?: number;
  docHeightIn?: number;
  objectPath?: string;
}

export interface ProjectCanvasItem {
  id: string;
  imageId: string;
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalW: number;
  naturalH: number;
  fileDPI: number;
}

export interface ProjectData {
  library: ProjectLibraryImage[];
  sheets: ProjectCanvasItem[][];
  sheetNames: string[];
}

export const gangSheetProjectsTable = pgTable("gang_sheet_projects", {
  id: serial("id").primaryKey(),
  shopifyCustomerId: text("shopify_customer_id").notNull(),
  name: text("name").notNull(),
  data: jsonb("data").$type<ProjectData>().notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GangSheetProject = typeof gangSheetProjectsTable.$inferSelect;
