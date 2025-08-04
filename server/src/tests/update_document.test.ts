
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type UpdateDocumentInput } from '../schema';
import { updateDocument } from '../handlers/update_document';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

// Test document data
const testDocument = {
  filename: 'original.pdf',
  original_filename: 'original.pdf',
  file_type: 'PDF' as const,
  file_size: 1024,
  file_path: '/uploads/original.pdf',
  content_text: 'Original content',
  metadata: { key: 'original_value' },
  upload_source: 'WEB_INTERFACE' as const,
  external_service_id: null
};

describe('updateDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update document filename', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      filename: 'updated.pdf'
    };

    const result = await updateDocument(updateInput, userId);

    expect(result.filename).toEqual('updated.pdf');
    expect(result.original_filename).toEqual('original.pdf'); // Should not change
    expect(result.content_text).toEqual('Original content'); // Should not change
    expect(result.metadata).toEqual({ key: 'original_value' }); // Should not change
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update document content_text', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      content_text: 'Updated content text'
    };

    const result = await updateDocument(updateInput, userId);

    expect(result.content_text).toEqual('Updated content text');
    expect(result.filename).toEqual('original.pdf'); // Should not change
    expect(result.metadata).toEqual({ key: 'original_value' }); // Should not change
  });

  it('should update document metadata', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      metadata: { new_key: 'new_value', updated: true }
    };

    const result = await updateDocument(updateInput, userId);

    expect(result.metadata).toEqual({ new_key: 'new_value', updated: true });
    expect(result.filename).toEqual('original.pdf'); // Should not change
    expect(result.content_text).toEqual('Original content'); // Should not change
  });

  it('should update multiple fields simultaneously', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      filename: 'multi-updated.pdf',
      content_text: 'Multi-updated content',
      metadata: { multi: 'update' }
    };

    const result = await updateDocument(updateInput, userId);

    expect(result.filename).toEqual('multi-updated.pdf');
    expect(result.content_text).toEqual('Multi-updated content');
    expect(result.metadata).toEqual({ multi: 'update' });
    expect(result.original_filename).toEqual('original.pdf'); // Should not change
  });

  it('should set content_text to null when explicitly provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      content_text: null
    };

    const result = await updateDocument(updateInput, userId);

    expect(result.content_text).toBeNull();
    expect(result.filename).toEqual('original.pdf'); // Should not change
  });

  it('should save changes to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test document
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: userId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      filename: 'saved-update.pdf'
    };

    await updateDocument(updateInput, userId);

    // Verify changes were saved to database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].filename).toEqual('saved-update.pdf');
    expect(documents[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when document not found', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: 999, // Non-existent document ID
      filename: 'should-fail.pdf'
    };

    await expect(updateDocument(updateInput, userId))
      .rejects.toThrow(/document not found or access denied/i);
  });

  it('should throw error when user does not own document', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'another_hash',
        name: 'Another User'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    // Create document owned by another user
    const docResult = await db.insert(documentsTable)
      .values({
        ...testDocument,
        user_id: anotherUserId
      })
      .returning()
      .execute();
    const documentId = docResult[0].id;

    const updateInput: UpdateDocumentInput = {
      id: documentId,
      filename: 'unauthorized.pdf'
    };

    // Try to update with different user ID
    await expect(updateDocument(updateInput, userId))
      .rejects.toThrow(/document not found or access denied/i);
  });
});
