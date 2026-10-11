// src/lib/db/index.ts — koneksi Neon serverless (HTTP driver) untuk Astro SSR.
// Dipakai API routes & better-auth. Jangan di-import di komponen client.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl =
  (typeof process !== "undefined" && process.env.DATABASE_URL) ||
  (import.meta.env as Record<string, unknown>).DATABASE_URL as string | undefined;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — jalankan `neon link` atau cek .env");
}

export const db = drizzle(neon(databaseUrl), { schema });
export { schema };
