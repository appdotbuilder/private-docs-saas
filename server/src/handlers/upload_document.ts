
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UploadDocumentInput, type Document } from '../schema';

export const uploadDocument = async (input: UploadDocumentInput, userId: number): Promise<Document> => {
  try {
    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        user_id: userId,
        filename: input.filename,
        original_filename: input.original_filename,
        file_type: input.file_type,
        file_size: input.file_size,
        file_path: input.file_path,
        content_text: input.content_text,
        metadata: input.metadata || null,
        upload_source: input.upload_source,
        external_service_id: input.external_service_id || null
      })
      .returning()
      .execute();

    // Type assertion to handle metadata type mismatch between DB and schema
    const document = result[0];
    return {
      ...document,
      metadata: document.metadata as Record<string, any> | null
    };
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};
