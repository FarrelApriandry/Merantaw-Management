// src/components/auth/AuthProtector.tsx — P0: jangan percaya localStorage saja.
// Sumber kebenaran = Firebase Auth session + dokumen users/{uid} di Firestore.
import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

export default function AuthProtector({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          try {
            localStorage.removeItem("userData");
          } catch {
            /* ignore */
          }
          window.location.href = "/auth/login";
          return;
        }

        // Verifikasi dokumen user — cegah localStorage palsu role=admin
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (!snap.exists()) {
          try {
            localStorage.removeItem("userData");
          } catch {
            /* ignore */
          }
          await auth.signOut().catch(() => undefined);
          window.location.href = "/auth/login";
          return;
        }
        const data = snap.data() as { isActive?: boolean; role?: string };
        if (data.isActive === false) {
          try {
            localStorage.removeItem("userData");
          } catch {
            /* ignore */
          }
          await auth.signOut().catch(() => undefined);
          window.location.href = "/auth/login";
          return;
        }

        setAuthorized(true);
        setChecking(false);
      } catch {
        try {
          localStorage.removeItem("userData");
        } catch {
          /* ignore */
        }
        window.location.href = "/auth/login";
      }
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === "userData" && !e.newValue) {
        window.location.href = "/auth/login";
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div>Checking authentication...</div>
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}

