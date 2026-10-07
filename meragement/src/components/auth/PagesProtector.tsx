// P0: Jangan percaya localStorage.role. Verifikasi via Firebase Auth + Firestore users/{uid}.
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

function PageNavigation({ href }: { href: string }) {
    
    useEffect(() => {
        window.location.href = href;
    }, [href]);

    return null;
}

function AdminProtector(): { isUserAdmin: boolean; checking: boolean } {
    const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            try {
                if (!fbUser) {
                    setIsUserAdmin(false);
                    return;
                }
                const snap = await getDoc(doc(db, "users", fbUser.uid));
                if (!snap.exists()) {
                    setIsUserAdmin(false);
                    return;
                }
                const data = snap.data() as { role?: string; isActive?: boolean };
                if (data.isActive === false) {
                    setIsUserAdmin(false);
                    return;
                }
                setIsUserAdmin(data.role === "admin");
            } catch {
                setIsUserAdmin(false);
            } finally {
                setChecking(false);
            }
        });
        return () => unsub();
    }, []);

    return { isUserAdmin, checking } as { isUserAdmin: boolean; checking: boolean };
}

export {
    PageNavigation,
    AdminProtector,
}