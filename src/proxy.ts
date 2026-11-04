import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic check only — is there a session cookie (web) or a bearer token
 * (mobile app) at all? It doesn't touch the database, so it can't tell a
 * valid session from an expired one. Real authentication happens in
 * lib/tenancy.ts (requireSession validates the session against the
 * database), and authorization in lib/authorization.ts. This is
 * defense-in-depth, not the security boundary — see Next's Data Access
 * Layer guidance in node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 *
 * Named `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the
 * convention; `middleware.ts` is deprecated.
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/api/auth"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  // The mobile app authenticates API calls with a bearer token instead of a cookie; the route itself verifies it.
  const hasBearer = pathname.startsWith("/api/") && request.headers.get("authorization")?.startsWith("Bearer ");
  if (!getSessionCookie(request) && !hasBearer) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
