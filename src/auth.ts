import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { findUserByEmail } from "@/repositories/users.repository";

// The full config — DB-backed authorize(), so Node-only. Used everywhere
// except proxy.ts (Server Components, Server Actions, the API route
// handler). See auth.config.ts for why the Credentials provider isn't
// shared with the Edge-safe proxy config.
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          campusId: user.campusId,
          teacherId: user.teacherId,
          avatarSeed: user.avatarSeed,
        };
      },
    }),
  ],
});
