import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    userId?: string;
    newElo?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    newElo?: number | null;
  }
}
