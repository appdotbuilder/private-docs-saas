
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { getDocument } from '../handlers/get_document';

describe('getDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a document when it exists and belongs to the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values({
        user_id: user.id,
        filename: 'test-document.pdf',
        original_filename: 'original-test.pdf',
        file_type: 'PDF',
        file_size: 1024,
        file_path: '/uploads/test-document.pdf',
        content_text: 'Test document content',
        metadata: { category: 'test' },
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      })
      .returning()
      .execute();

    const document = documentResult[0];

    // Test the handler
    const result = await getDocument(document.id, user.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(document.id);
    expect(result!.user_id).toEqual(user.id);
    expect(result!.filename).toEqual('test-document.pdf');
    expect(result!.original_filename).toEqual('original-test.pdf');
    expect(result!.file_type).toEqual('PDF');
    expect(result!.file_size).toEqual(1024);
    expect(typeof result!.file_size).toEqual('number');
    expect(result!.file_path).toEqual('/uploads/test-document.pdf');
    expect(result!.content_text).toEqual('Test document content');
    expect(result!.metadata).toEqual({ category: 'test' });
    expect(result!.upload_source).toEqual('WEB_INTERFACE');
    expect(result!.external_service_id).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when document does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Try to get non-existent document
    const result = await getDocument(999, user.id);

    expect(result).toBeNull();
  });

  it('should return null when document belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User One'
      })
      .returning()
      .execute();
    
    const user1 = user1Result[0];

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User Two'
      })
      .returning()
      .execute();
    
    const user2 = user2Result[0];

    // Create document for user1
    const documentResult = await db.insert(documentsTable)
      .values({
        user_id: user1.id,
        filename: 'user1-document.pdf',
        original_filename: 'user1-original.pdf',
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

    const document = documentResult[0];

    // Try to get user1's document as user2
    const result = await getDocument(document.id, user2.id);

    expect(result).toBeNull();
  });

  it('should handle documents with null content_text and metadata', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create document with null values
    const documentResult = await db.insert(documentsTable)
      .values({
        user_id: user.id,
        filename: 'minimal-document.jpeg',
        original_filename: 'minimal.jpeg',
        file_type: 'JPEG',
        file_size: 512,
        file_path: '/uploads/minimal-document.jpeg',
        content_text: null,
        metadata: null,
        upload_source: 'EXTERNAL_SERVICE',
        external_service_id: 'ext_123'
      })
      .returning()
      .execute();

    const document = documentResult[0];

    // Test the handler
    const result = await getDocument(document.id, user.id);

    expect(result).not.toBeNull();
    expect(result!.content_text).toBeNull();
    expect(result!.metadata).toBeNull();
    expect(result!.upload_source).toEqual('EXTERNAL_SERVICE');
    expect(result!.external_service_id).toEqual('ext_123');
  });
});
