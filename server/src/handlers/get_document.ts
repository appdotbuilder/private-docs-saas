
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type Document } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getDocument = async (documentId: number, userId: number): Promise<Document | null> => {
  try {
    // Query document by ID and ensure it belongs to the authenticated user
    const results = await db.select()
      .from(documentsTable)
      .where(and(
        eq(documentsTable.id, documentId),
        eq(documentsTable.user_id, userId)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const document = results[0];
    
    // Convert bigint file_size back to number and handle metadata type
    return {
      ...document,
      file_size: Number(document.file_size),
      metadata: document.metadata as Record<string, any> | null
    };
  } catch (error) {
    console.error('Document retrieval failed:', error);
    throw error;
  }
};
