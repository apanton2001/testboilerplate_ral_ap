import { signIn, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Register a new user
 * @param email User email
 * @param password User password
 * @param fullName User's full name
 * @returns Response data or error
 */
export const registerUser = async (
  email: string,
  password: string,
  fullName: string
) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'An error occurred during registration');
  }
};

/**
 * Login user using NextAuth credentials provider
 * @param email User email
 * @param password User password
 * @returns NextAuth sign in result
 */
export const loginUser = async (email: string, password: string) => {
  try {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    return result;
  } catch (error: any) {
    throw new Error(error.message || 'An error occurred during login');
  }
};

/**
 * Logout user using NextAuth
 */
export const logoutUser = async () => {
  try {
    await signOut({ redirect: false });
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * Get current user profile from backend API
 * @param token JWT token
 * @returns User profile data
 */
export const getCurrentUser = async (token: string) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch user profile');
    }

    return data.user;
  } catch (error: any) {
    throw new Error(error.message || 'An error occurred while fetching user profile');
  }
};

/**
 * Check if user has required role
 * @param userRoles User's roles
 * @param requiredRole Required role to check
 * @returns Boolean indicating if user has the required role
 */
export const hasRole = (userRoles: string[], requiredRole: string): boolean => {
  return userRoles.includes(requiredRole);
};

/**
 * Check if user has any of the required roles
 * @param userRoles User's roles
 * @param requiredRoles Array of required roles
 * @returns Boolean indicating if user has any of the required roles
 */
export const hasAnyRole = (userRoles: string[], requiredRoles: string[]): boolean => {
  return userRoles.some(role => requiredRoles.includes(role));
};