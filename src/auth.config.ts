import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/types";

// Module augmentation lives here (not duplicated in auth.ts) since this is
// the one config both auth.ts (full, Node-only, DB-backed) and proxy.ts
// (Edge-safe, JWT-decode-only) import.
declare module "next-auth" {
  interface User {
    role: Role;
    schoolId: string | null;
    campusId: string | null;
    teacherId: string | null;
    avatarSeed: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      schoolId: string | null;
      campusId: string | null;
      teacherId: string | null;
      avatarSeed: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    schoolId: string | null;
    campusId: string | null;
    teacherId: string | null;
    avatarSeed: string;
  }
}

/**
 * Deliberately has NO providers with database access (no Credentials
 * provider here) — this is what proxy.ts builds its own lightweight `auth()`
 * from, so the proxy bundle never pulls in bcrypt/postgres. Auth.js's own
 * recommended split for Credentials-based auth + Edge middleware/proxy; see
 * src/auth.ts for the full config (providers + DB-backed authorize) used
 * everywhere else (Server Components, Server Actions, the API route).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.campusId = user.campusId;
        token.teacherId = user.teacherId;
        token.avatarSeed = user.avatarSeed;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.schoolId = token.schoolId;
      session.user.campusId = token.campusId;
      session.user.teacherId = token.teacherId;
      session.user.avatarSeed = token.avatarSeed;
      return session;
    },
  },
} satisfies NextAuthConfig;
