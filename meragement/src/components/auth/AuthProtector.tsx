// src/components/auth/AuthProtector.tsx
import { useEffect, useState, type ReactNode } from "react";
import type { StoredUser } from "@/lib/types";

/**
 * AuthProtector
 * - Memeriksa `localStorage.userData` untuk menentukan apakah user terautentikasi.
 * - Jika tidak ada/invalid -> redirect ke /login
 * - Jika ada -> render children
 */

export default function AuthProtector({ children }: { children: ReactNode }) {
    const [authorized, setAuthorized] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(true);

    const checkAuth = (): boolean => {
        try {
        const raw = localStorage.getItem("userData");
        if (!raw) return false;

        const parsed = JSON.parse(raw) as Partial<StoredUser>;
        // minimal fields yang kita butuhkan
        if (!parsed.email) return false;
        if (!parsed.role) return false;

        // optional: cek isActive flag jika ada
        if (parsed.isActive === false) return false;

        // lulus pengecekan
        console.log("User data:", localStorage.getItem("userData"))
        return true;
        } catch {
        return false;
        }
    };

    useEffect(() => {
        const runCheck = () => {
            setChecking(true);
            const ok = checkAuth();
            if (!ok) {
                // cleanup dan redirect
                try { localStorage.removeItem("userData"); } catch {}
                window.location.href = "/auth/login";
                return;
            }
            setAuthorized(true);
            setChecking(false);
        };

        runCheck();

        // listen for navigation events (back/forward/pushState/hashchange)
        const onPop = () => runCheck();
        const onHash = () => runCheck();

        window.addEventListener("popstate", onPop);
        window.addEventListener("hashchange", onHash);

        // also listen storage changes (another tab logs out)
        const onStorage = (e: StorageEvent) => {
            if (e.key === "userData") runCheck();
        };
        window.addEventListener("storage", onStorage);

        return () => {
        window.removeEventListener("popstate", onPop);
        window.removeEventListener("hashchange", onHash);
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

    if (!authorized) {
        // In practice we redirect earlier; this is fallback
        return null;
    }

    return <>{children}</>;
}
