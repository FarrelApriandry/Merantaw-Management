// src/components/auth/PagesProtector.tsx — P0-migrasi: role dari better-auth session.
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export function PageNavigation({ href }: { href: string }) {
    useEffect(() => {
        window.location.href = href;
    }, [href]);

    return null;
}

export function AdminProtector(): { isUserAdmin: boolean; checking: boolean } {
    const { data, isPending } = useSession();
    const user = data?.user;
    const isUserAdmin = !!user && user.isActive !== false && user.role === "admin";
    return { isUserAdmin, checking: isPending };
}
