import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Liquor record schema based on fixed-width format
export const liquorRecords = pgTable("liquor_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  liquorCode: text("liquor_code").notNull(),
  brandName: text("brand_name").notNull(),
  adaNumber: text("ada_number"),
  adaName: text("ada_name"),
  vendorName: text("vendor_name"),
  proof: text("proof"),
  bottleSize: text("bottle_size"),
  packSize: text("pack_size"),
  onPremisePrice: real("on_premise_price"),
  offPremisePrice: real("off_premise_price"),
  shelfPrice: real("shelf_price"),
  upcCode1: text("upc_code_1"),
  upcCode2: text("upc_code_2"),
  effectiveDate: text("effective_date"),
});

export const insertLiquorRecordSchema = createInsertSchema(liquorRecords).omit({
  id: true,
});

export type InsertLiquorRecord = z.infer<typeof insertLiquorRecordSchema>;
export type LiquorRecord = typeof liquorRecords.$inferSelect;

// File processing result schema
export const fileProcessingResult = z.object({
  success: z.boolean(),
  totalRecords: z.number(),
  uniqueBrands: z.number(),
  uniqueVendors: z.number(),
  avgPrice: z.number(),
  records: z.array(z.object({
    liquorCode: z.string(),
    brandName: z.string(),
    adaNumber: z.string(),
    adaName: z.string(),
    vendorName: z.string(),
    proof: z.string(),
    bottleSize: z.string(),
    packSize: z.string(),
    onPremisePrice: z.union([z.number(), z.string()]),
    offPremisePrice: z.union([z.number(), z.string()]),
    shelfPrice: z.union([z.number(), z.string()]),
    upcCode1: z.string(),
    upcCode2: z.string(),
    effectiveDate: z.string(),
  })),
  error: z.string().optional(),
});

export type FileProcessingResult = z.infer<typeof fileProcessingResult>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
