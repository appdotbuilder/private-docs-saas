
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Document schema
export const documentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_type: z.enum(['JPEG', 'PDF', 'JSON']),
  file_size: z.number(),
  file_path: z.string(),
  content_text: z.string().nullable(), // Extracted text content for search
  metadata: z.record(z.any()).nullable(), // JSON metadata
  upload_source: z.enum(['WEB_INTERFACE', 'EXTERNAL_SERVICE']),
  external_service_id: z.string().nullable(), // For tracking external uploads like scansioni.ch
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

// Authentication schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Document upload schema
export const uploadDocumentInputSchema = z.object({
  filename: z.string(),
  original_filename: z.string(),
  file_type: z.enum(['JPEG', 'PDF', 'JSON']),
  file_size: z.number().positive(),
  file_path: z.string(),
  content_text: z.string().nullable(),
  metadata: z.record(z.any()).nullable().optional(),
  upload_source: z.enum(['WEB_INTERFACE', 'EXTERNAL_SERVICE']),
  external_service_id: z.string().nullable().optional()
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Document search schema
export const searchDocumentsInputSchema = z.object({
  query: z.string().min(1),
  file_type: z.enum(['JPEG', 'PDF', 'JSON']).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type SearchDocumentsInput = z.infer<typeof searchDocumentsInputSchema>;

// Get user documents schema
export const getUserDocumentsInputSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  file_type: z.enum(['JPEG', 'PDF', 'JSON']).optional()
});

export type GetUserDocumentsInput = z.infer<typeof getUserDocumentsInputSchema>;

// Update document schema
export const updateDocumentInputSchema = z.object({
  id: z.number(),
  filename: z.string().optional(),
  content_text: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional()
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>;

// External upload schema (for services like scansioni.ch)
export const externalUploadInputSchema = z.object({
  user_email: z.string().email(),
  filename: z.string(),
  original_filename: z.string(),
  file_type: z.enum(['JPEG', 'PDF', 'JSON']),
  file_size: z.number().positive(),
  file_path: z.string(),
  content_text: z.string().nullable(),
  metadata: z.record(z.any()).nullable().optional(),
  external_service_id: z.string(),
  service_name: z.string() // e.g., "scansioni.ch"
});

export type ExternalUploadInput = z.infer<typeof externalUploadInputSchema>;

// Response schemas
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().optional()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const documentListResponseSchema = z.object({
  documents: z.array(documentSchema),
  total: z.number(),
  has_more: z.boolean()
});

export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;
