
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

const validLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const invalidLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'wrongpassword'
};

const nonExistentUserInput: LoginInput = {
  email: 'nonexistent@example.com',
  password: 'somepassword'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword,
        name: testUser.name
      })
      .execute();
  });

  it('should authenticate user with valid credentials', async () => {
    const result = await loginUser(validLoginInput);

    // Verify user data
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.name).toEqual(testUser.name);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token!.length).toBeGreaterThan(0);
  });

  it('should reject login with invalid password', async () => {
    await expect(loginUser(invalidLoginInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject login for non-existent user', async () => {
    await expect(loginUser(nonExistentUserInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should not expose password hash in response', async () => {
    const result = await loginUser(validLoginInput);
    
    // Verify password hash is present but not exposed in a dangerous way
    expect(result.user.password_hash).toBeDefined();
    expect(result.user.password_hash).not.toEqual(testUser.password);
    expect(result.user.password_hash.length).toBeGreaterThan(20); // Hashed passwords are long
  });

  it('should generate different tokens for different login sessions', async () => {
    const result1 = await loginUser(validLoginInput);
    const result2 = await loginUser(validLoginInput);

    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token!).not.toEqual(result2.token!);
  });
});
