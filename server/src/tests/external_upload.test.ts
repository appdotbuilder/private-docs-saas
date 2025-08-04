
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type ExternalUploadInput } from '../schema';
import { externalUpload } from '../handlers/external_upload';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

// Test external upload input
const testInput: ExternalUploadInput = {
  user_email: 'test@example.com',
  filename: 'scan_001.pdf',
  original_filename: 'document.pdf',
  file_type: 'PDF',
  file_size: 1024000,
  file_path: '/uploads/external/scan_001.pdf',
  content_text: 'This is extracted text content from the PDF',
  metadata: { source: 'scanner', quality: 'high' },
  external_service_id: 'scansioni_ch_12345',
  service_name: 'scansioni.ch'
};

describe('externalUpload', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload document for existing user', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await externalUpload(testInput);

    // Verify document fields
    expect(result.filename).toEqual('scan_001.pdf');
    expect(result.original_filename).toEqual('document.pdf');
    expect(result.file_type).toEqual('PDF');
    expect(result.file_size).toEqual(1024000);
    expect(result.file_path).toEqual('/uploads/external/scan_001.pdf');
    expect(result.content_text).toEqual('This is extracted text content from the PDF');
    expect(result.metadata).toEqual({ source: 'scanner', quality: 'high' });
    expect(result.upload_source).toEqual('EXTERNAL_SERVICE');
    expect(result.external_service_id).toEqual('scansioni_ch_12345');
    expect(result.id).toBeDefined();
    expect(result.user_id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const result = await externalUpload(testInput);

    // Query database to verify document was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.user_id).toEqual(userResult[0].id);
    expect(document.filename).toEqual('scan_001.pdf');
    expect(document.file_type).toEqual('PDF');
    expect(document.upload_source).toEqual('EXTERNAL_SERVICE');
    expect(document.external_service_id).toEqual('scansioni_ch_12345');
    expect(document.content_text).toEqual('This is extracted text content from the PDF');
    expect(document.metadata).toEqual({ source: 'scanner', quality: 'high' });
  });

  it('should handle null content_text and metadata', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const inputWithNulls: ExternalUploadInput = {
      ...testInput,
      content_text: null,
      metadata: null
    };

    const result = await externalUpload(inputWithNulls);

    expect(result.content_text).toBeNull();
    expect(result.metadata).toBeNull();
    expect(result.upload_source).toEqual('EXTERNAL_SERVICE');
  });

  it('should throw error for non-existent user', async () => {
    const inputWithBadEmail: ExternalUploadInput = {
      ...testInput,
      user_email: 'nonexistent@example.com'
    };

    await expect(externalUpload(inputWithBadEmail))
      .rejects.toThrow(/User not found with email/i);
  });

  it('should associate document with correct user', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([
        testUser,
        { email: 'other@example.com', password_hash: 'hash', name: 'Other User' }
      ])
      .execute();

    const result = await externalUpload(testInput);

    // Verify document is associated with correct user
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(result.user_id).toEqual(users[0].id);
  });
});
