// src/lib/hooks/useCurrentUser.ts — P0: sumber kebenaran = Firebase Auth + users/{uid}.
// localStorage hanya cache display, bukan otorisasi. AuthProtector/rules yang menegakkan akses.
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import type { StoredUser } from "../types";

function readCache(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("userData");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export const useCurrentUser = (): StoredUser | null => {
  const [user, setUser] = useState<StoredUser | null>(() => readCache());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (!snap.exists()) {
          setUser(null);
          return;
        }
        const data = snap.data() as Partial<StoredUser> & { email?: string; name?: string; role?: string; status?: string; isActive?: boolean };
        if (data.isActive === false) {
          setUser(null);
          return;
        }
        const verified: StoredUser = {
          uid: fbUser.uid,
          email: data.email ?? fbUser.email ?? "",
          role: data.role ?? "member",
          status: data.status ?? "active",
          name: data.name,
          isActive: data.isActive,
        };
        setUser(verified);
        // refresh cache display saja
        try {
          localStorage.setItem("userData", JSON.stringify(verified));
        } catch {
          /* ignore */
        }
      } catch {
        // offline / permission-denied: pertahankan cache agar UI tidak blank,
        // keputusan akses tetap di AuthProtector + firestore.rules
        setUser(readCache());
      }
    });
    return () => unsub();
  }, []);

  return user;
};

