import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/auth";

/** Better Auth's endpoints: /api/auth/sign-in/password (see src/auth.ts), /api/auth/get-session, /api/auth/sign-out, /api/auth/list-sessions, /api/auth/revoke-other-sessions, ... */
export const { GET, POST } = toNextJsHandler(auth);
