import "server-only";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import type { BetterAuthPlugin } from "better-auth";
import * as z from "zod";
import { db } from "@/db";
import { authAccounts, authSessions, authVerifications, users } from "@/db/schema";
import { findUserByEmail, recordFailedLogin, recordSuccessfulLogin } from "@/repositories/users.repository";
import { clientIp, isIpBlocked, LOCK_MINUTES, MAX_ACCOUNT_FAILURES, recordIpFailure, TOO_MANY_ATTEMPTS } from "@/lib/login-throttle";

/**
 * Authentication — Better Auth.
 *
 * Sessions live in the database (auth_sessions): every signed-in browser or
 * device is a row that can be listed and revoked, so "sign out everywhere"
 * and "a reset password logs out old devices" are real. The web app keeps
 * the session token in an httpOnly cookie; the mobile app sends the same
 * token as `Authorization: Bearer <token>` (the bearer plugin).
 *
 * Sign-in is our own endpoint, POST /api/auth/sign-in/password, rather than
 * Better Auth's built-in email/password flow, because it keeps EduFlow's
 * existing rules: bcrypt hashes on users.password_hash, per-account lockout
 * and per-IP limits (lib/login-throttle.ts), and no self sign-up — accounts
 * are only created by staff. Request body: { email, password, rememberMe? }.
 * Response: { token, user } plus the session cookie (and a
 * `set-auth-token` header for mobile clients).
 *
 * Who the user is and what they may do is still decided per request by
 * lib/tenancy.ts (requireSession re-reads the user) and lib/authorization.ts.
 */

const SESSION_DAYS = 30;

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

const INVALID = "Invalid email or password.";

const passwordSignIn = {
  id: "eduflow-password-sign-in",
  endpoints: {
    signInPassword: createAuthEndpoint(
      "/sign-in/password",
      {
        method: "POST",
        body: z.object({
          email: z.string().trim().min(1).max(254),
          password: z.string().min(1).max(200),
          rememberMe: z.boolean().optional(),
        }),
      },
      async (ctx) => {
        const ip = clientIp(ctx.request?.headers ?? ctx.headers);
        if (isIpBlocked(ip)) throw new APIError("TOO_MANY_REQUESTS", { message: TOO_MANY_ATTEMPTS, code: "TOO_MANY_ATTEMPTS" });

        const user = await findUserByEmail(ctx.body.email);
        if (!user) {
          await bcrypt.compare(ctx.body.password, await getDummyHash());
          recordIpFailure(ip);
          throw new APIError("UNAUTHORIZED", { message: INVALID, code: "INVALID_EMAIL_OR_PASSWORD" });
        }
        // While locked, even the right password is refused (otherwise guessing could simply continue).
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          recordIpFailure(ip);
          throw new APIError("TOO_MANY_REQUESTS", { message: TOO_MANY_ATTEMPTS, code: "TOO_MANY_ATTEMPTS" });
        }
        if (!user.passwordHash || !(await bcrypt.compare(ctx.body.password, user.passwordHash))) {
          recordIpFailure(ip);
          if (await recordFailedLogin(user.id, MAX_ACCOUNT_FAILURES, LOCK_MINUTES)) {
            throw new APIError("TOO_MANY_REQUESTS", { message: TOO_MANY_ATTEMPTS, code: "TOO_MANY_ATTEMPTS" });
          }
          throw new APIError("UNAUTHORIZED", { message: INVALID, code: "INVALID_EMAIL_OR_PASSWORD" });
        }
        if (user.failedLoginCount > 0 || user.lockedUntil) await recordSuccessfulLogin(user.id);

        const dontRemember = ctx.body.rememberMe === false;
        const session = await ctx.context.internalAdapter.createSession(user.id, dontRemember);
        if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Couldn't start a session. Please try again." });
        const authUser = await ctx.context.internalAdapter.findUserById(user.id);
        if (!authUser) throw new APIError("UNAUTHORIZED", { message: INVALID });
        await setSessionCookie(ctx, { session, user: authUser }, dontRemember);
        return ctx.json({
          token: session.token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword },
        });
      },
    ),
  },
} satisfies BetterAuthPlugin;

export const auth = betterAuth({
  appName: "EduFlow",
  // AUTH_SECRET / AUTH_URL are accepted too, so existing deployments keep working without renaming env vars.
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications },
  }),
  user: {
    // Read-only extras on the session's user (accounts are created and edited through EduFlow's own services).
    additionalFields: {
      role: { type: "string", input: false },
      schoolId: { type: "string", required: false, input: false },
      campusId: { type: "string", required: false, input: false },
      teacherId: { type: "string", required: false, input: false },
      avatarSeed: { type: "string", required: false, input: false },
      mustChangePassword: { type: "boolean", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * SESSION_DAYS,
    updateAge: 60 * 60 * 24, // extend an active session at most once a day
  },
  // Built-in email/password sign-up and sign-in stay off — see passwordSignIn above.
  emailAndPassword: { enabled: false },
  advanced: {
    database: { generateId: "uuid" },
    // Behind a reverse proxy the last X-Forwarded-For entry is the real client (lib/login-throttle.ts explains why).
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  rateLimit: {
    // Better Auth's own limiter (per IP, in memory) on top of our per-account lockout.
    customRules: { "/sign-in/password": { window: 60, max: 20 } },
  },
  plugins: [passwordSignIn, bearer(), nextCookies()],
});

export type Auth = typeof auth;
