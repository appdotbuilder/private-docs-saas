
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.user.password_hash).toBeDefined();
    expect(result.user.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await registerUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.user.password_hash).not.toEqual('password123');
    expect(result.user.password_hash.length).toBeGreaterThan(20);

    // Verify password can be verified using Bun's password verification
    const isValid = await Bun.password.verify('password123', result.user.password_hash);
    expect(isValid).toBe(true);

    const isInvalid = await Bun.password.verify('wrongpassword', result.user.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create second user with same email
    await expect(registerUser(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should reject duplicate email case insensitive', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create second user with same email but different case
    const duplicateInput: RegisterInput = {
      ...testInput,
      email: 'TEST@EXAMPLE.COM'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should normalize email to lowercase', async () => {
    const uppercaseInput: RegisterInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      name: 'Test User'
    };

    const result = await registerUser(uppercaseInput);

    // Email should be stored in lowercase
    expect(result.user.email).toEqual('test@example.com');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users[0].email).toEqual('test@example.com');
  });

  it('should generate unique tokens for different users', async () => {
    const firstResult = await registerUser(testInput);
    
    const secondInput: RegisterInput = {
      email: 'test2@example.com',
      password: 'password456',
      name: 'Test User 2'
    };
    
    const secondResult = await registerUser(secondInput);

    expect(firstResult.token).not.toEqual(secondResult.token);
    expect(firstResult.user.id).not.toEqual(secondResult.user.id);
  });
});
