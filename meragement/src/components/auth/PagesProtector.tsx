import { useState, useEffect } from "react";
import type { StoredUser } from "@/lib/types";

function PageNavigation({ href }: { href: string }) {
    
    useEffect(() => {
        window.location.href = href;
    }, [href]);

    return null;
}

function AdminProtector(): { isUserAdmin: boolean } {
    const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const userData = localStorage.getItem("userData");
            if (userData) {
                const parsedData = JSON.parse(userData) as Partial<StoredUser>;
                setIsUserAdmin(parsedData.role === "admin");
            }
        }
    }, []);

    return { isUserAdmin };
}

export {
    PageNavigation,
    AdminProtector,
}