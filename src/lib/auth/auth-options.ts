// =============================================================================
// NextAuth Configuration
// JobTread API key authentication - NO demo/fallback mode
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
          throw new Error('Email and API key are required.');
        }

        const apiUrl = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

        let response: Response;
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${credentials.apiKey}`,
            },
            body: JSON.stringify({
              query: `{ me { id email firstName lastName organization { id name } } }`,
            }),
          });
        } catch (err) {
          throw new Error(
            'Could not connect to JobTread API. Check your network and JOBTREAD_API_URL setting.'
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key. Go to JobTread Settings → API to get your key.');
        }

        if (!response.ok) {
          throw new Error(`JobTread API returned ${response.status}. Try again later.`);
        }

        let result: {
          data?: {
            me?: {
              id: string;
              email: string;
              firstName: string;
              lastName: string;
              organization?: { id: string; name: string };
            };
          };
          errors?: { message: string }[];
        };
        try {
          result = await response.json();
        } catch {
          throw new Error('Invalid response from JobTread API.');
        }

        if (result.errors && result.errors.length > 0) {
          throw new Error(`JobTread: ${result.errors[0].message}`);
        }

        if (!result.data?.me) {
          throw new Error(
            'Could not retrieve your account. Verify your API key has read access.'
          );
        }

        const user = result.data.me;
        return {
          id: user.id,
          email: user.email || credentials.email,
          name: `${user.firstName} ${user.lastName}`.trim() || credentials.email,
          accessToken: credentials.apiKey,
          organization: user.organization?.name,
        };
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
