
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterInput): Promise<AuthResponse> => {
  try {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = input.email.toLowerCase();

    // Check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password (using Bun's built-in password hashing)
    const password_hash = await Bun.password.hash(input.password);

    // Create new user record with normalized email
    const result = await db.insert(usersTable)
      .values({
        email: normalizedEmail,
        password_hash,
        name: input.name
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate JWT token (simplified - in production use proper JWT library)
    const token = `jwt_token_${user.id}_${Date.now()}`;

    return {
      user,
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};
