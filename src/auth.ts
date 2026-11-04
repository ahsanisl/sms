import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { findUserByEmail, recordFailedLogin, recordSuccessfulLogin } from "@/repositories/users.repository";
import { clientIp, isIpBlocked, LOCK_MINUTES, MAX_ACCOUNT_FAILURES, recordIpFailure, TooManyAttemptsError } from "@/lib/login-throttle";

/**
 * Compared against when the email has no account, so a wrong email takes as
 * long to reject as a wrong password — response timing then can't reveal
 * which emails exist. Hash of a random value nobody can sign in with.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), 12);
  return dummyHash;
}

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
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        // Brute-force protection — see src/lib/login-throttle.ts.
        const ip = clientIp(request);
        if (isIpBlocked(ip)) throw new TooManyAttemptsError();

        const user = await findUserByEmail(email);
        if (!user) {
          await bcrypt.compare(password, await getDummyHash());
          recordIpFailure(ip);
          return null;
        }
        // While locked, even the right password is refused (otherwise guessing could simply continue).
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          recordIpFailure(ip);
          throw new TooManyAttemptsError();
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          recordIpFailure(ip);
          if (await recordFailedLogin(user.id, MAX_ACCOUNT_FAILURES, LOCK_MINUTES)) throw new TooManyAttemptsError();
          return null;
        }
        if (user.failedLoginCount > 0 || user.lockedUntil) await recordSuccessfulLogin(user.id);

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
