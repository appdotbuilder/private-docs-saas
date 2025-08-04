
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type GetUserDocumentsInput, type DocumentListResponse } from '../schema';
import { eq, desc, and, SQL, count } from 'drizzle-orm';

export const getUserDocuments = async (input: GetUserDocumentsInput, userId: number): Promise<DocumentListResponse> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(documentsTable.user_id, userId)
    ];

    // Add file type filter if specified
    if (input.file_type) {
      conditions.push(eq(documentsTable.file_type, input.file_type));
    }

    // Execute main query with all conditions applied at once
    const documents = await db.select()
      .from(documentsTable)
      .where(and(...conditions))
      .orderBy(desc(documentsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Get total count for pagination info
    const [{ count: totalCount }] = await db.select({ count: count() })
      .from(documentsTable)
      .where(and(...conditions))
      .execute();

    // Calculate if there are more results
    const has_more = input.offset + documents.length < totalCount;

    return {
      documents: documents.map(doc => ({
        ...doc,
        file_size: Number(doc.file_size), // Convert bigint to number
        metadata: doc.metadata as Record<string, any> | null // Type assertion for metadata
      })),
      total: totalCount,
      has_more
    };
  } catch (error) {
    console.error('Failed to get user documents:', error);
    throw error;
  }
};
