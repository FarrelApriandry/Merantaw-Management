import { useState,useEffect } from "react";

export function PageNavigation({ href }) {
    
    useEffect(() => {
        window.location.href = href;
    }, [href]);

    return null;
}

export function AdminProtector() {
    const [isUserAdmin, setIsUserAdmin] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const userData = localStorage.getItem("userData");
            if (userData) {
                const parsedData = JSON.parse(userData);
                setIsUserAdmin(parsedData.role === "admin");
            }
        }
    }, []);

    return { isUserAdmin };
}