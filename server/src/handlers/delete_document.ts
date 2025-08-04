
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteDocument = async (documentId: number, userId: number): Promise<boolean> => {
  try {
    // Delete document only if it belongs to the authenticated user
    const result = await db.delete(documentsTable)
      .where(and(
        eq(documentsTable.id, documentId),
        eq(documentsTable.user_id, userId)
      ))
      .execute();

    // Return true if a row was deleted, false if document not found or doesn't belong to user
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
};
