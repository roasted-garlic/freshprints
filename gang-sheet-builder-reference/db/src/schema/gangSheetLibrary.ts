import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const gangSheetLibraryTable = pgTable("gang_sheet_library", {
  id: serial("id").primaryKey(),
  shopifyCustomerId: text("shopify_customer_id").notNull(),
  name: text("name").notNull(),
  objectPath: text("object_path").notNull(),
  naturalW: integer("natural_w").notNull(),
  naturalH: integer("natural_h").notNull(),
  fileDpi: integer("file_dpi").notNull().default(300),
  docWidthIn: real("doc_width_in"),
  docHeightIn: real("doc_height_in"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type GangSheetLibraryImage = typeof gangSheetLibraryTable.$inferSelect;
