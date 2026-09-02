import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Builds its OWN `auth()` from the DB-free authConfig (see auth.config.ts) —
 * deliberately does NOT import "@/auth", which pulls in bcrypt + the
 * Postgres driver via the Credentials provider's authorize(). Proxy/
 * Middleware can run on the Edge runtime, where neither of those work; this
 * keeps the proxy bundle to a JWT decode/verify only.
 *
 * Optimistic check only — is there a session at all? Real authorization
 * (per-role, per-module) lives in the service layer (src/lib/authorization.ts),
 * which is DB-backed and can't run here anyway. This is defense-in-depth,
 * not the security boundary — see Next's own Data Access Layer guidance in
 * node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 *
 * Named `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the
 * convention; `middleware.ts` is deprecated.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
