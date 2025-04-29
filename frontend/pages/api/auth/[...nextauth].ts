import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

/**
 * NextAuth.js configuration for the Automated Customs Documentation Platform
 * Implements:
 * - Credentials provider for email/password authentication
 * - JWT session management
 * - Role-based access control
 */

// Define custom types for extended user and session
interface CustomUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  token: string;
}

declare module "next-auth" {
  interface User extends CustomUser {}
  
  interface Session {
    user: {
      id: string;
      name?: string;
      email: string;
      role: string;
    };
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken?: string;
    expired?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<"email" | "password", string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call backend API for authentication
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
          }

          // Return user data with token and role information
          return {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.full_name,
            role: data.user.roles[0]?.name || 'User',
            token: data.token,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: CustomUser | undefined }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.accessToken = user.token;
      }
      
      // Check token expiration (15 minutes idle timeout)
      const tokenExpiration = token.iat ? (token.iat + 15 * 60) : 0;
      if (Date.now() / 1000 > tokenExpiration) {
        // Token has expired due to inactivity
        return { ...token, expired: true };
      }
      
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
        
        // Check if token is expired
        if (token.expired) {
          throw new Error('Session expired');
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

export default NextAuth(authOptions);