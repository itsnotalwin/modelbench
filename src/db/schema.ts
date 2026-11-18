import { boolean, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const runPreferences = pgTable("run_preferences", {
  workspaceId: uuid("workspace_id").notNull(),
  runSlug: text("run_slug").notNull(),
  saved: boolean("saved").notNull().default(false),
  scores: jsonb("scores").$type<Record<string, number | null>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.workspaceId, t.runSlug] })]);
