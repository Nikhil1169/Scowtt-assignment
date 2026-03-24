import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Shared Auth.js configuration without Prisma — safe to import from Edge middleware.
 * The full `auth.ts` merges this with PrismaAdapter for Node route handlers.
 */
const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        // Persist profile fields on the JWT — without these, JWT sessions lose
        // name / email / image after the first response (user is only set at sign-in).
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub ?? token.id) as string;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? session.user.image;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
