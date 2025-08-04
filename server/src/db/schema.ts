
import { serial, text, pgTable, timestamp, integer, pgEnum, jsonb, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const fileTypeEnum = pgEnum('file_type', ['JPEG', 'PDF', 'JSON']);
export const uploadSourceEnum = pgEnum('upload_source', ['WEB_INTERFACE', 'EXTERNAL_SERVICE']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Documents table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_type: fileTypeEnum('file_type').notNull(),
  file_size: bigint('file_size', { mode: 'number' }).notNull(), // Use bigint for large files
  file_path: text('file_path').notNull(),
  content_text: text('content_text'), // Nullable for extracted text content
  metadata: jsonb('metadata'), // Nullable JSON metadata
  upload_source: uploadSourceEnum('upload_source').notNull(),
  external_service_id: text('external_service_id'), // Nullable for external service tracking
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  documents: many(documentsTable)
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the tables
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  documents: documentsTable 
};
