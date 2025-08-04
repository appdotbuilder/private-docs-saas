
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type UploadDocumentInput } from '../schema';
import { uploadDocument } from '../handlers/upload_document';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

// Test document input
const testInput: UploadDocumentInput = {
  filename: 'test-document.pdf',
  original_filename: 'Original Document.pdf',
  file_type: 'PDF',
  file_size: 2048,
  file_path: '/uploads/test-document.pdf',
  content_text: 'This is extracted text content from the PDF',
  metadata: { pages: 5, language: 'en' },
  upload_source: 'WEB_INTERFACE',
  external_service_id: null
};

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a document', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await uploadDocument(testInput, userId);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.filename).toEqual('test-document.pdf');
    expect(result.original_filename).toEqual('Original Document.pdf');
    expect(result.file_type).toEqual('PDF');
    expect(result.file_size).toEqual(2048);
    expect(result.file_path).toEqual('/uploads/test-document.pdf');
    expect(result.content_text).toEqual('This is extracted text content from the PDF');
    expect(result.metadata).toEqual({ pages: 5, language: 'en' });
    expect(result.upload_source).toEqual('WEB_INTERFACE');
    expect(result.external_service_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await uploadDocument(testInput, userId);

    // Query document from database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.user_id).toEqual(userId);
    expect(document.filename).toEqual('test-document.pdf');
    expect(document.original_filename).toEqual('Original Document.pdf');
    expect(document.file_type).toEqual('PDF');
    expect(document.file_size).toEqual(2048);
    expect(document.content_text).toEqual('This is extracted text content from the PDF');
    expect(document.metadata).toEqual({ pages: 5, language: 'en' });
    expect(document.upload_source).toEqual('WEB_INTERFACE');
    expect(document.external_service_id).toBeNull();
    expect(document.created_at).toBeInstanceOf(Date);
    expect(document.updated_at).toBeInstanceOf(Date);
  });

  it('should handle external service upload', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const externalInput: UploadDocumentInput = {
      ...testInput,
      upload_source: 'EXTERNAL_SERVICE',
      external_service_id: 'scansioni-123456'
    };

    const result = await uploadDocument(externalInput, userId);

    expect(result.upload_source).toEqual('EXTERNAL_SERVICE');
    expect(result.external_service_id).toEqual('scansioni-123456');
  });

  it('should handle optional fields correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const minimalInput: UploadDocumentInput = {
      filename: 'image.jpg',
      original_filename: 'photo.jpg',
      file_type: 'JPEG',
      file_size: 1024,
      file_path: '/uploads/image.jpg',
      content_text: null,
      upload_source: 'WEB_INTERFACE'
    };

    const result = await uploadDocument(minimalInput, userId);

    expect(result.content_text).toBeNull();
    expect(result.metadata).toBeNull();
    expect(result.external_service_id).toBeNull();
  });

  it('should handle different file types', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const jsonInput: UploadDocumentInput = {
      filename: 'data.json',
      original_filename: 'export.json',
      file_type: 'JSON',
      file_size: 512,
      file_path: '/uploads/data.json',
      content_text: '{"key": "value"}',
      metadata: { schema_version: '1.0' },
      upload_source: 'WEB_INTERFACE'
    };

    const result = await uploadDocument(jsonInput, userId);

    expect(result.file_type).toEqual('JSON');
    expect(result.content_text).toEqual('{"key": "value"}');
    expect(result.metadata).toEqual({ schema_version: '1.0' });
  });
});
