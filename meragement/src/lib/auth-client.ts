// src/lib/auth-client.ts — better-auth client (pangganti firebase/auth di sisi UI).
// Pakai hooks React: useSession() — pengganti onAuthStateChanged.
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_AUTH_URL || undefined, // undefined = same-origin
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
