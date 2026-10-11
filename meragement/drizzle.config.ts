// drizzle.config.ts — konfigurasi drizzle-kit (migrate/push/studio)
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Neon production branch — wajib verifikasi sebelum destructif
  strict: true,
  verbose: true,
});
