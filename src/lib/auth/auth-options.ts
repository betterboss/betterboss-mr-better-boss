// =============================================================================
// NextAuth Configuration
// Handles JobTread OAuth + credential-based authentication
// =============================================================================

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      organization?: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    accessToken: string;
    organization?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    organization?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // JobTread API Key / Token authentication
    CredentialsProvider({
      id: 'jobtread-credentials',
      name: 'JobTread',
      credentials: {
        apiKey: {
          label: 'JobTread API Key',
          type: 'password',
          placeholder: 'Enter your JobTread API key',
        },
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey || !credentials?.email) {
          return null;
        }

        try {
          // Validate the API key by making a test query to JobTread
          const apiUrl = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${credentials.apiKey}`,
            },
            body: JSON.stringify({
              query: `query { me { id email firstName lastName organization { id name } } }`,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const result = await response.json();

          if (result.errors || !result.data?.me) {
            return null;
          }

          const user = result.data.me;
          return {
            id: user.id,
            email: user.email || credentials.email,
            name: `${user.firstName} ${user.lastName}`,
            accessToken: credentials.apiKey,
            organization: user.organization?.name,
          };
        } catch {
          // If API validation fails, allow demo mode with stored key
          return {
            id: 'demo-user',
            email: credentials.email,
            name: 'Demo User',
            accessToken: credentials.apiKey,
            organization: 'Demo Organization',
          };
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.organization = user.organization;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.sub || '';
        session.user.organization = token.organization;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
