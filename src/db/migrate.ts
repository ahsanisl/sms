import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Runs migrations programmatically via drizzle-orm's own migrator, rather
 * than shelling out to `drizzle-kit migrate`. On this project's dev database
 * (Supabase, session pooler) the drizzle-kit CLI's migrate command hung
 * indefinitely and eventually failed with no useful error; this achieves
 * the exact same thing (applies the SQL files in ./drizzle/migrations,
 * tracked in the same drizzle.__drizzle_migrations table) using the same
 * postgres-js driver the app itself uses, which connects fine. If this
 * turns out to be specific to that one connection, `drizzle-kit migrate` is
 * worth retrying against a different Postgres host.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and set DATABASE_URL first.");
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations applied.");

  await sql.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
