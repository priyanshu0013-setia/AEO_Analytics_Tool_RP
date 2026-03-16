import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";

export const llmResponsesTable = pgTable("llm_responses", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  llm: text("llm").notNull(),
  query: text("query").notNull(),
  responseText: text("response_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLlmResponseSchema = createInsertSchema(llmResponsesTable).omit({ id: true, createdAt: true });
export type InsertLlmResponse = z.infer<typeof insertLlmResponseSchema>;
export type LlmResponse = typeof llmResponsesTable.$inferSelect;
