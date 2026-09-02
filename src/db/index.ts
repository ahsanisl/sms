import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * The one place a Postgres connection is created. Nothing outside this file
 * (and the repositories that import `db`) should touch `postgres`/Drizzle
 * directly — see src/repositories/* for the query layer, src/services/* for
 * business logic. UI code must never import this module.
 *
 * Only DATABASE_URL is required — no Supabase-specific client, API, or SDK
 * is used anywhere. Swapping DATABASE_URL to any other Postgres provider
 * (self-managed, RDS, Railway, etc.) and re-running migrations is the entire
 * migration path off Supabase.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set DATABASE_URL to your Postgres connection string.",
  );
}

// A module-level singleton, guarded against Next.js dev-mode hot-reload
// creating a fresh connection pool on every file change.
const globalForDb = globalThis as unknown as { __eduflowSql?: postgres.Sql };

const client =
  globalForDb.__eduflowSql ??
  postgres(connectionString, {
    // Supabase's pooled ("transaction mode") connection string needs this;
    // harmless against a direct/self-managed Postgres connection too.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__eduflowSql = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
