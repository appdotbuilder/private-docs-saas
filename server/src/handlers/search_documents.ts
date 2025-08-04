
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type SearchDocumentsInput, type DocumentListResponse } from '../schema';
import { eq, and, ilike, or, SQL, desc, count } from 'drizzle-orm';

export const searchDocuments = async (input: SearchDocumentsInput, userId: number): Promise<DocumentListResponse> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(documentsTable.user_id, userId));
    
    // Add search conditions - search in filename and content_text
    const searchTerm = `%${input.query}%`;
    conditions.push(
      or(
        ilike(documentsTable.filename, searchTerm),
        ilike(documentsTable.original_filename, searchTerm),
        ilike(documentsTable.content_text, searchTerm)
      )!
    );
    
    // Add file type filter if specified
    if (input.file_type) {
      conditions.push(eq(documentsTable.file_type, input.file_type));
    }
    
    // Build the main query
    const results = await db.select()
      .from(documentsTable)
      .where(and(...conditions))
      .orderBy(desc(documentsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();
    
    // Get total count for pagination
    const countResult = await db.select({ count: count() })
      .from(documentsTable)
      .where(and(...conditions))
      .execute();
    
    const total = countResult[0]?.count || 0;
    
    // Check if there are more results
    const has_more = input.offset + results.length < total;
    
    // Transform results to match schema expectations
    const documents = results.map(doc => ({
      ...doc,
      metadata: doc.metadata as Record<string, any> | null
    }));
    
    return {
      documents,
      total,
      has_more
    };
  } catch (error) {
    console.error('Document search failed:', error);
    throw error;
  }
};
