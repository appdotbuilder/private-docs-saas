
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type ExternalUploadInput, type Document } from '../schema';
import { eq } from 'drizzle-orm';

export const externalUpload = async (input: ExternalUploadInput): Promise<Document> => {
  try {
    // Find user by email address
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.user_email))
      .execute();

    if (users.length === 0) {
      throw new Error(`User not found with email: ${input.user_email}`);
    }

    const user = users[0];

    // Insert document record with external service tracking
    const result = await db.insert(documentsTable)
      .values({
        user_id: user.id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_type: input.file_type,
        file_size: input.file_size,
        file_path: input.file_path,
        content_text: input.content_text,
        metadata: input.metadata || null,
        upload_source: 'EXTERNAL_SERVICE',
        external_service_id: input.external_service_id
      })
      .returning()
      .execute();

    const document = result[0];
    
    // Type-cast metadata to match expected type
    return {
      ...document,
      metadata: document.metadata as Record<string, any> | null
    };
  } catch (error) {
    console.error('External upload failed:', error);
    throw error;
  }
};
