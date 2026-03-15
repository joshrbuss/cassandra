import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

/**
 * Simple credentials provider — the server actions validate usernames
 * against public chess APIs and upsert the user, then call signIn with
 * the resulting userId. This provider just looks up the user by ID.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: { userId: {} },
      async authorize(credentials) {
        const userId = credentials?.userId as string | undefined;
        if (!userId) return null;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        return {
          id: user.id,
          name: user.lichessUsername ?? user.chessComUsername ?? "Player",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        userId: token.userId as string | undefined,
      };
    },
  },
});
