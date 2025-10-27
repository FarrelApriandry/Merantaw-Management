// src/components/auth/AuthProtector.jsx
import { useEffect, useState } from "react";

/**
 * AuthProtector
 * - Memeriksa `localStorage.userData` untuk menentukan apakah user terautentikasi.
 * - Jika tidak ada/invalid -> redirect ke /login
 * - Jika ada -> render children
 *
 * Cara pakai:
 * - Import dan gunakan sebagai wrapper di DashboardLayout.astro
 * - Karena ini React client component, render dengan `client:load` di Astro:
 *    <AuthProtector client:load> ... </AuthProtector>
 */

export default function AuthProtector({ children }) {
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    const checkAuth = () => {
        try {
        const raw = localStorage.getItem("userData");
        if (!raw) return false;

        const parsed = JSON.parse(raw);
        // minimal fields yang kita butuhkan
        if (!parsed.email) return false;
        if (!parsed.role) return false;

        // optional: cek isActive flag jika ada
        if (parsed.isActive === false) return false;

        // lulus pengecekan
        console.log("User data:", localStorage.getItem("userData"))
        return true;
        } catch (e) {
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
        const onStorage = (e) => {
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
