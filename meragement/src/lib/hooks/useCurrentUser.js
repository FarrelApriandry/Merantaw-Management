// src/lib/hooks/useCurrentUser.js
export const useCurrentUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("userData");
    try {
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};