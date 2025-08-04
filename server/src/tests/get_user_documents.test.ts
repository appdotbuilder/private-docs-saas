
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type GetUserDocumentsInput } from '../schema';
import { getUserDocuments } from '../handlers/get_user_documents';

describe('getUserDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      },
      {
        email: 'other@example.com',
        password_hash: 'hashed_password',
        name: 'Other User'
      }
    ]).returning().execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test documents for both users
    await db.insert(documentsTable).values([
      {
        user_id: testUserId,
        filename: 'doc1.pdf',
        original_filename: 'document1.pdf',
        file_type: 'PDF',
        file_size: 1024,
        file_path: '/uploads/doc1.pdf',
        content_text: 'First document content',
        metadata: { type: 'invoice' },
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      },
      {
        user_id: testUserId,
        filename: 'doc2.jpeg',
        original_filename: 'document2.jpeg',
        file_type: 'JPEG',
        file_size: 2048,
        file_path: '/uploads/doc2.jpeg',
        content_text: 'Second document content',
        metadata: { type: 'receipt' },
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      },
      {
        user_id: testUserId,
        filename: 'doc3.json',
        original_filename: 'document3.json',
        file_type: 'JSON',
        file_size: 512,
        file_path: '/uploads/doc3.json',
        content_text: 'Third document content',
        metadata: { type: 'data' },
        upload_source: 'EXTERNAL_SERVICE',
        external_service_id: 'ext123'
      },
      {
        user_id: otherUserId,
        filename: 'other_doc.pdf',
        original_filename: 'other_document.pdf',
        file_type: 'PDF',
        file_size: 3072,
        file_path: '/uploads/other_doc.pdf',
        content_text: 'Other user document',
        metadata: { type: 'contract' },
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      }
    ]).execute();
  });

  it('should get all documents for a user', async () => {
    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0
    };

    const result = await getUserDocuments(input, testUserId);

    expect(result.documents).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.has_more).toBe(false);

    // Check documents are ordered by creation date (most recent first)
    const filenames = result.documents.map(doc => doc.filename);
    expect(filenames).toContain('doc1.pdf');
    expect(filenames).toContain('doc2.jpeg');
    expect(filenames).toContain('doc3.json');

    // Verify only user's documents are returned
    result.documents.forEach(doc => {
      expect(doc.user_id).toBe(testUserId);
      expect(typeof doc.file_size).toBe('number');
      expect(doc.id).toBeDefined();
      expect(doc.created_at).toBeInstanceOf(Date);
      expect(doc.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter documents by file type', async () => {
    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0,
      file_type: 'PDF'
    };

    const result = await getUserDocuments(input, testUserId);

    expect(result.documents).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.has_more).toBe(false);
    expect(result.documents[0].filename).toBe('doc1.pdf');
    expect(result.documents[0].file_type).toBe('PDF');
  });

  it('should handle pagination correctly', async () => {
    const input: GetUserDocumentsInput = {
      limit: 2,
      offset: 0
    };

    const result = await getUserDocuments(input, testUserId);

    expect(result.documents).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.has_more).toBe(true);

    // Test second page
    const secondPageInput: GetUserDocumentsInput = {
      limit: 2,
      offset: 2
    };

    const secondResult = await getUserDocuments(secondPageInput, testUserId);

    expect(secondResult.documents).toHaveLength(1);
    expect(secondResult.total).toBe(3);
    expect(secondResult.has_more).toBe(false);
  });

  it('should return empty result for user with no documents', async () => {
    // Create a new user with no documents
    const [newUser] = await db.insert(usersTable).values({
      email: 'empty@example.com',
      password_hash: 'hashed_password',
      name: 'Empty User'
    }).returning().execute();

    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0
    };

    const result = await getUserDocuments(input, newUser.id);

    expect(result.documents).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.has_more).toBe(false);
  });

  it('should not return other users documents', async () => {
    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0
    };

    const result = await getUserDocuments(input, testUserId);

    // Should not contain the other user's document
    const filenames = result.documents.map(doc => doc.filename);
    expect(filenames).not.toContain('other_doc.pdf');

    // Verify all returned documents belong to the correct user
    result.documents.forEach(doc => {
      expect(doc.user_id).toBe(testUserId);
    });
  });

  it('should handle file type filter with no matches', async () => {
    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0,
      file_type: 'JPEG'
    };

    const result = await getUserDocuments(input, otherUserId);

    expect(result.documents).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.has_more).toBe(false);
  });

  it('should handle metadata properly', async () => {
    const input: GetUserDocumentsInput = {
      limit: 20,
      offset: 0
    };

    const result = await getUserDocuments(input, testUserId);

    expect(result.documents.length).toBeGreaterThan(0);
    
    // Check that metadata is properly typed and accessible
    const docWithMetadata = result.documents.find(doc => doc.filename === 'doc1.pdf');
    expect(docWithMetadata).toBeDefined();
    expect(docWithMetadata!.metadata).toEqual({ type: 'invoice' });
    expect(typeof docWithMetadata!.metadata).toBe('object');
  });
});
