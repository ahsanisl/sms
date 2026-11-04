import "server-only";
import { CredentialsSignin } from "next-auth";

/**
 * Sign-in brute-force protection, used by authorize() in src/auth.ts.
 *
 * 1. Per account (database — survives restarts, shared by every server):
 *    MAX_ACCOUNT_FAILURES wrong passwords in a row lock the account for
 *    LOCK_MINUTES. A successful sign-in, a password change or an admin
 *    reset clears it.
 * 2. Per IP address (this server's memory): caps how many failed attempts
 *    one address can make across *any* accounts, against password spraying.
 *    In-memory means each server process counts separately and a restart
 *    clears it — fine for a single server; use a shared store (e.g. Redis)
 *    if EduFlow ever runs on several.
 */
export const MAX_ACCOUNT_FAILURES = 5;
export const LOCK_MINUTES = 15;
const MAX_IP_FAILURES = 20;
const IP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Shown for both a locked account and a blocked IP. Deliberately one generic
 * message: it doesn't confirm which emails have accounts. The code travels
 * to the browser (see lib/auth/session-context.tsx), so it must stay vague.
 */
export class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

const ipFailures = new Map<string, { count: number; windowStart: number }>();

/**
 * The LAST X-Forwarded-For entry: the one added by our own reverse proxy
 * (nginx appends; Vercel overwrites the header). Earlier entries are supplied
 * by the client and could be rotated to dodge the limit. Assumes exactly one
 * proxy in front of the app; with none, X-Forwarded-For is absent or fully
 * client-controlled — the per-account lockout still applies either way.
 */
export function clientIp(request: Request | undefined): string {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || request?.headers.get("x-real-ip") || "unknown";
}

export function isIpBlocked(ip: string): boolean {
  const entry = ipFailures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > IP_WINDOW_MS) {
    ipFailures.delete(ip);
    return false;
  }
  return entry.count >= MAX_IP_FAILURES;
}

export function recordIpFailure(ip: string) {
  const now = Date.now();
  const entry = ipFailures.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) ipFailures.set(ip, { count: 1, windowStart: now });
  else entry.count++;
  // Keep the map bounded: drop expired windows once it grows.
  if (ipFailures.size > 10_000) {
    for (const [key, value] of ipFailures) if (now - value.windowStart > IP_WINDOW_MS) ipFailures.delete(key);
  }
}
