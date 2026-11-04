import { config } from "dotenv";
config({ path: ".env.local" });

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

/**
 * Creates the FIRST Platform Admin on a fresh production database — the
 * safe alternative to the demo seed (which loads demo accounts with a public
 * password). Run once, after `npm run db:migrate`:
 *
 *   npm run db:bootstrap -- --email you@yourcompany.com --name "Your Name"
 *
 * - Refuses if a Platform Admin already exists (it's a one-time bootstrap,
 *   not a back door).
 * - Generates the password itself and prints it once, so it never sits in
 *   shell history; the account must choose its own at first sign-in.
 * - Everything after this happens in the app: the Platform Admin creates each
 *   school and its Owner (Settings → Schools), and Owners add their staff.
 */
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const email = argValue("email")?.trim().toLowerCase();
  const name = argValue("name")?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    fail('Usage: npm run db:bootstrap -- --email you@yourcompany.com --name "Your Name"');
  }
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  const db = drizzle(sql);
  try {
    const existingAdmin = await db.select({ id: users.id }).from(users).where(eq(users.role, "platform_admin")).limit(1);
    if (existingAdmin.length) fail("A Platform Admin already exists — nothing to do. Use the app to manage accounts.");
    const emailTaken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (emailTaken.length) fail(`An account with ${email} already exists.`);

    const password = Array.from({ length: 14 }, () => TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)]).join("");
    await db.insert(users).values({
      role: "platform_admin",
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      avatarSeed: name,
    });

    console.log("\nPlatform Admin created.");
    console.log(`  Email:              ${email}`);
    console.log(`  Temporary password: ${password}`);
    console.log("\nThis password is shown only once. Sign in and you'll be asked to choose your own.");
    console.log("Then create each school and its Owner from Settings → Schools.\n");
  } catch (error) {
    // Drizzle wraps the driver's error ("Failed query: ...") — the Postgres message is on .cause.
    const message = [error, error instanceof Error ? error.cause : undefined].map((e) => (e instanceof Error ? e.message : String(e ?? ""))).join(" ");
    if (/relation .* does not exist|column .* does not exist/.test(message)) fail("The database isn't set up yet — run  npm run db:migrate  first.");
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
