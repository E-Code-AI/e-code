// Checkpoints schema for version control
import { pgTable, serial, text, integer, timestamp, json } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const checkpoints = pgTable('checkpoints', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  userId: integer('user_id').notNull(),
  message: text('message').notNull(),
  filesSnapshot: json('files_snapshot').notNull(), // JSON snapshot of all files at this point
  parentCheckpointId: integer('parent_checkpoint_id'), // For branching
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
});

export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;