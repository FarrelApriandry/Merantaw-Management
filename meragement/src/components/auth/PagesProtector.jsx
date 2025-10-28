import { useState,useEffect } from "react";

function PageNavigation({ href }) {
    
    useEffect(() => {
        window.location.href = href;
    }, [href]);

    return null;
}

function AdminProtector() {
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

export {
    PageNavigation,
    AdminProtector,
}