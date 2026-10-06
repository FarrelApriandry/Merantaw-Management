// src/lib/hooks/useCurrentUser.ts
import type { StoredUser } from "../types";

export const useCurrentUser = (): StoredUser | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("userData");
    try {
        return stored ? (JSON.parse(stored) as StoredUser) : null;
    } catch {
        return null;
    }
};
