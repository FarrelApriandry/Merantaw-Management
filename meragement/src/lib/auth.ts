// src/lib/auth.ts — better-auth server instance (pangganti Firebase Auth).
// Password: bcrypt (bunuh dependensi scrypt default biar mudah dimigrasi).
// Data: tabel `user`, `session`, `account`, `verification` di Neon (Drizzle).
// Field tambahan `role` & `isActive` = pengganti kolom dokumen users/{uid} lama.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { user, session, account, verification } from "./db/schema";

function serverEnv(name: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[name] : undefined;
  if (fromProcess) return fromProcess;
  const v = (import.meta.env as Record<string, unknown>)[name];
  return typeof v === "string" && v ? v : undefined;
}

export const auth = betterAuth({
  appName: "Meragement",
  baseURL: serverEnv("BETTER_AUTH_URL") || "http://localhost:4321",
  secret:
    serverEnv("BETTER_AUTH_SECRET") ||
    (() => {
      throw new Error("BETTER_AUTH_SECRET is not set — cek .env");
    })(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    password: {
      hash: (password: string) => bcrypt.hash(password, 10),
      verify: ({ hash, password }: { hash: string; password: string }) =>
        bcrypt.compare(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    cookieCache: { enabled: true, maxAge: 5 * 60 }, // cache sesi di cookie 5 menit
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "member", input: true },
      isActive: { type: "boolean", defaultValue: true, input: true },
    },
  },
  plugins: [
    admin({
      // Admin dikenali dari kolom `role` (default-nya memang ["admin"])
      adminRoles: ["admin"],
      // Kosakata role app ini: member (default) & admin
      defaultRole: "member",
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
