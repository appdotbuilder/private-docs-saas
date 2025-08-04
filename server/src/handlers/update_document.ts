
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UpdateDocumentInput, type Document } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateDocument = async (input: UpdateDocumentInput, userId: number): Promise<Document> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof documentsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.filename !== undefined) {
      updateData.filename = input.filename;
    }

    if (input.content_text !== undefined) {
      updateData.content_text = input.content_text;
    }

    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    // Update document record with user verification
    const result = await db.update(documentsTable)
      .set(updateData)
      .where(and(
        eq(documentsTable.id, input.id),
        eq(documentsTable.user_id, userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Document not found or access denied');
    }

    // Convert the database result to match the Document schema type
    const document = result[0];
    return {
      id: document.id,
      user_id: document.user_id,
      filename: document.filename,
      original_filename: document.original_filename,
      file_type: document.file_type,
      file_size: document.file_size,
      file_path: document.file_path,
      content_text: document.content_text,
      metadata: document.metadata as Record<string, any> | null,
      upload_source: document.upload_source,
      external_service_id: document.external_service_id,
      created_at: document.created_at,
      updated_at: document.updated_at
    };
  } catch (error) {
    console.error('Document update failed:', error);
    throw error;
  }
};
