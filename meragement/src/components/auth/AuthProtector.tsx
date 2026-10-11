// src/components/auth/AuthProtector.tsx — P0-migrasi: guard pakai better-auth session.
// Tidak ada lagi localStorage check / onAuthStateChanged — session = cookie HttpOnly.
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export default function AuthProtector({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !data?.user) {
      window.location.href = "/auth/login";
    }
  }, [isPending, data]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div>Checking authentication...</div>
      </div>
    );
  }

  if (!data?.user) return null;
  return <>{children}</>;
}
