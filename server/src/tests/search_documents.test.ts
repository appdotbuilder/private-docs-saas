
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type SearchDocumentsInput } from '../schema';
import { searchDocuments } from '../handlers/search_documents';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  name: 'Test User'
};

// Test documents data
const testDocuments = [
  {
    filename: 'invoice_2024.pdf',
    original_filename: 'invoice_2024.pdf',
    file_type: 'PDF' as const,
    file_size: 1024,
    file_path: '/uploads/invoice_2024.pdf',
    content_text: 'Invoice for software subscription services',
    metadata: { category: 'business' },
    upload_source: 'WEB_INTERFACE' as const,
    external_service_id: null
  },
  {
    filename: 'receipt_grocery.jpeg',
    original_filename: 'receipt_grocery.jpeg',
    file_type: 'JPEG' as const,
    file_size: 2048,
    file_path: '/uploads/receipt_grocery.jpeg',
    content_text: 'Grocery store receipt with food items',
    metadata: { category: 'personal' },
    upload_source: 'WEB_INTERFACE' as const,
    external_service_id: null
  },
  {
    filename: 'contract.pdf',
    original_filename: 'employment_contract.pdf',
    file_type: 'PDF' as const,
    file_size: 4096,
    file_path: '/uploads/contract.pdf',
    content_text: 'Employment contract with salary details',
    metadata: { category: 'legal' },
    upload_source: 'EXTERNAL_SERVICE' as const,
    external_service_id: 'scan123'
  }
];

describe('searchDocuments', () => {
  let userId: number;
  let otherUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test documents for main user
    await db.insert(documentsTable)
      .values(testDocuments.map(doc => ({ ...doc, user_id: userId })))
      .execute();

    // Create a document for other user (should not appear in search)
    await db.insert(documentsTable)
      .values({
        ...testDocuments[0],
        user_id: otherUserId,
        filename: 'other_user_invoice.pdf'
      })
      .execute();
  });

  afterEach(resetDB);

  it('should search documents by filename', async () => {
    const input: SearchDocumentsInput = {
      query: 'invoice',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].filename).toEqual('invoice_2024.pdf');
    expect(result.documents[0].user_id).toEqual(userId);
    expect(result.total).toEqual(1);
    expect(result.has_more).toBe(false);
  });

  it('should search documents by content text', async () => {
    const input: SearchDocumentsInput = {
      query: 'grocery',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].filename).toEqual('receipt_grocery.jpeg');
    expect(result.documents[0].content_text).toContain('Grocery store receipt');
    expect(result.total).toEqual(1);
    expect(result.has_more).toBe(false);
  });

  it('should search documents by original filename', async () => {
    const input: SearchDocumentsInput = {
      query: 'employment',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].original_filename).toEqual('employment_contract.pdf');
    expect(result.total).toEqual(1);
    expect(result.has_more).toBe(false);
  });

  it('should filter documents by file type', async () => {
    const input: SearchDocumentsInput = {
      query: 'receipt',
      file_type: 'JPEG',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].file_type).toEqual('JPEG');
    expect(result.documents[0].filename).toEqual('receipt_grocery.jpeg');
    expect(result.total).toEqual(1);
  });

  it('should return empty results when file type filter excludes matches', async () => {
    const input: SearchDocumentsInput = {
      query: 'receipt',
      file_type: 'PDF',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.has_more).toBe(false);
  });

  it('should implement pagination correctly', async () => {
    // Search for a term that matches multiple documents
    const input: SearchDocumentsInput = {
      query: 'pdf',
      limit: 1,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.total).toEqual(2); // Should have 2 PDF documents
    expect(result.has_more).toBe(true);

    // Get second page
    const secondPageInput: SearchDocumentsInput = {
      query: 'pdf',
      limit: 1,
      offset: 1
    };

    const secondPageResult = await searchDocuments(secondPageInput, userId);

    expect(secondPageResult.documents).toHaveLength(1);
    expect(secondPageResult.total).toEqual(2);
    expect(secondPageResult.has_more).toBe(false);

    // Ensure different documents on each page
    expect(result.documents[0].id).not.toEqual(secondPageResult.documents[0].id);
  });

  it('should only return documents for the specified user', async () => {
    const input: SearchDocumentsInput = {
      query: 'invoice',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].filename).toEqual('invoice_2024.pdf');
    expect(result.documents[0].user_id).toEqual(userId);

    // Search for other user should not return results for main user's documents
    const otherUserResult = await searchDocuments(input, otherUserId);
    expect(otherUserResult.documents).toHaveLength(1);
    expect(otherUserResult.documents[0].filename).toEqual('other_user_invoice.pdf');
    expect(otherUserResult.documents[0].user_id).toEqual(otherUserId);
  });

  it('should return empty results for non-matching search', async () => {
    const input: SearchDocumentsInput = {
      query: 'nonexistent',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.has_more).toBe(false);
  });

  it('should handle case-insensitive search', async () => {
    const input: SearchDocumentsInput = {
      query: 'INVOICE',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].filename).toEqual('invoice_2024.pdf');
  });

  it('should order results by creation date descending', async () => {
    const input: SearchDocumentsInput = {
      query: 'pdf',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(2);
    
    // Verify ordering - more recent documents should come first
    for (let i = 0; i < result.documents.length - 1; i++) {
      expect(result.documents[i].created_at >= result.documents[i + 1].created_at).toBe(true);
    }
  });

  it('should handle partial word matches', async () => {
    const input: SearchDocumentsInput = {
      query: 'soft',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].content_text).toContain('software');
  });

  it('should preserve metadata structure', async () => {
    const input: SearchDocumentsInput = {
      query: 'invoice',
      limit: 20,
      offset: 0
    };

    const result = await searchDocuments(input, userId);

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].metadata).toEqual({ category: 'business' });
    expect(typeof result.documents[0].metadata).toBe('object');
  });
});
