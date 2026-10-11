// src/lib/hooks/useCurrentUser.ts — P0-migrasi: sumber kebenaran = better-auth session.
// Pengganti implementasi Firebase (onAuthStateChanged + getDoc users/{uid}).
// localStorage tidak lagi dipakai — session di-cookie oleh better-auth (cookieCache 5 menit).
import { useSession } from "@/lib/auth-client";
import type { StoredUser } from "../types";

export const useCurrentUser = (): StoredUser | null => {
  const { data, isPending } = useSession();

  if (isPending || !data?.user) return null;
  const u = data.user;
  if (u.isActive === false) return null;

  return {
    uid: u.id,
    email: u.email,
    name: u.name,
    role: u.role ?? "member",
    status: "active",
    isActive: u.isActive ?? true,
  };
};
