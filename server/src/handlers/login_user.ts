
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password against stored hash
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token for authentication
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = await Bun.password.hash(JSON.stringify(payload));

    return {
      user: user,
      token: token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};
