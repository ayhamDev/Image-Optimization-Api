import {
  date,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", [
  "Queued",
  "Processing",
  "Completed",
  "Failed",
]);

export const queueTable = pgTable("queue", {
  id: serial().primaryKey(),
  queueId: varchar({ length: 256 }),
  originalName: text().notNull(),
  compressedName: text().notNull(),
  status: statusEnum().notNull(),
  url: text().unique().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  processdAt: timestamp(),
  completedAt: timestamp(),
});
