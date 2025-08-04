
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { deleteDocument } from '../handlers/delete_document';
import { eq } from 'drizzle-orm';

describe('deleteDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete document belonging to user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values({
        user_id: userId,
        filename: 'test-document.pdf',
        original_filename: 'test-document.pdf',
        file_type: 'PDF',
        file_size: 1024,
        file_path: '/uploads/test-document.pdf',
        content_text: 'Test document content',
        metadata: { title: 'Test Document' },
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      })
      .returning()
      .execute();
    const documentId = documentResult[0].id;

    // Delete the document
    const result = await deleteDocument(documentId, userId);

    expect(result).toBe(true);

    // Verify document was deleted from database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(documents).toHaveLength(0);
  });

  it('should return false for non-existent document', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent document
    const result = await deleteDocument(99999, userId);

    expect(result).toBe(false);
  });

  it('should return false when user tries to delete another users document', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create document belonging to user1
    const documentResult = await db.insert(documentsTable)
      .values({
        user_id: user1Id,
        filename: 'user1-document.pdf',
        original_filename: 'user1-document.pdf',
        file_type: 'PDF',
        file_size: 2048,
        file_path: '/uploads/user1-document.pdf',
        content_text: 'User 1 document content',
        metadata: null,
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      })
      .returning()
      .execute();
    const documentId = documentResult[0].id;

    // Try to delete user1's document as user2
    const result = await deleteDocument(documentId, user2Id);

    expect(result).toBe(false);

    // Verify document still exists in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].user_id).toBe(user1Id);
  });

  it('should handle multiple documents for same user correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple documents
    const document1Result = await db.insert(documentsTable)
      .values({
        user_id: userId,
        filename: 'document1.pdf',
        original_filename: 'document1.pdf',
        file_type: 'PDF',
        file_size: 1024,
        file_path: '/uploads/document1.pdf',
        content_text: 'Document 1 content',
        metadata: null,
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      })
      .returning()
      .execute();

    const document2Result = await db.insert(documentsTable)
      .values({
        user_id: userId,
        filename: 'document2.jpeg',
        original_filename: 'document2.jpeg',
        file_type: 'JPEG',
        file_size: 2048,
        file_path: '/uploads/document2.jpeg',
        content_text: null,
        metadata: { dimensions: '1920x1080' },
        upload_source: 'EXTERNAL_SERVICE',
        external_service_id: 'ext_123'
      })
      .returning()
      .execute();

    const document1Id = document1Result[0].id;
    const document2Id = document2Result[0].id;

    // Delete first document
    const result = await deleteDocument(document1Id, userId);

    expect(result).toBe(true);

    // Verify only first document was deleted
    const remainingDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.user_id, userId))
      .execute();

    expect(remainingDocuments).toHaveLength(1);
    expect(remainingDocuments[0].id).toBe(document2Id);
    expect(remainingDocuments[0].filename).toBe('document2.jpeg');
  });
});
