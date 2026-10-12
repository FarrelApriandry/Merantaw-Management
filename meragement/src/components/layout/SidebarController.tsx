// src/components/layout/SidebarController.tsx — P0: jangan dump semua projects untuk title.
import { useState, useEffect, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export interface SidebarControllerProps {
  children: ReactNode;
  Header: string;
}

export default function SidebarController({ children, Header }: SidebarControllerProps) {
    // Mobile (<md) mulai tertutup sebagai drawer; desktop mulai terbuka.
    const [isOpen, setIsOpen] = useState<boolean>(
        () => typeof window === "undefined" || window.innerWidth >= 768,
    );
    const [activeTitle, setActiveTitle] = useState<string>(Header);

    useEffect(() => {
        // Ambil ID dari URL secara client-side
        const pathParts = window.location.pathname.split('/');
        const spaceId = pathParts[pathParts.indexOf('space') + 1];

        if (spaceId) {
            // Judul dari API (poll sekali; murah & tanpa realtime SDK)
            let cancelled = false;
            (async () => {
                try {
                    const res = await fetch(`/api/projects/${spaceId}`);
                    if (!res.ok) return;
                    const data = (await res.json()) as { title?: string };
                    if (!cancelled && data.title) setActiveTitle("Project - " + data.title);
                } catch {
                    /* abaikan — pakai Header default */
                }
            })();
            return () => { cancelled = true; };
        } else {
            setActiveTitle(Header);
        }
    }, [Header]); // Trigger ulang kalau navigasi berubah

    return (
        <div className="flex min-h-screen bg-[#0D132B] text-white overflow-hidden">
            <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500`}>
                {/* Pakai activeTitle yang sudah diupdate, bukan Header mentah */}
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} Header={activeTitle}/>
                <div className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0">{children}</div>
            </div>
        </div>
    );
}