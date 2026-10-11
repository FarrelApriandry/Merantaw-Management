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
        <div className="w-64 space-y-3" aria-busy="true" aria-label="Memeriksa sesi…">
          <div className="animate-pulse rounded-lg bg-white/10 h-6 w-2/3 mx-auto" />
          <div className="animate-pulse rounded-lg bg-white/10 h-4 w-full" />
          <div className="animate-pulse rounded-lg bg-white/10 h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!data?.user) return null;
  return <>{children}</>;
}
