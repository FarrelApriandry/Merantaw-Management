// src/components/layout/SidebarController.tsx — P0: jangan dump semua projects untuk title.
import { useState, useEffect, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import type { Project } from "@/lib/types";

export interface SidebarControllerProps {
  children: ReactNode;
  Header: string;
}

export default function SidebarController({ children, Header }: SidebarControllerProps) {
    const [isOpen, setIsOpen] = useState<boolean>(true);
    const [activeTitle, setActiveTitle] = useState<string>(Header);

    useEffect(() => {
        // Ambil ID dari URL secara client-side
        const pathParts = window.location.pathname.split('/');
        const spaceId = pathParts[pathParts.indexOf('space') + 1];

        if (spaceId) {
            // P0: listen SATU doc saja, bukan collection(projects)
            const unsub = onSnapshot(doc(db, "projects", spaceId), (snap) => {
                if (snap.exists()) {
                    const data = snap.data() as Partial<Project>;
                    setActiveTitle("Project - " + (data.title ?? ""));
                }
            });
            return () => unsub();
        } else {
            setActiveTitle(Header);
        }
    }, [Header]); // Trigger ulang kalau navigasi berubah

    return (
        <div className="flex min-h-screen bg-[#0D132B] text-white overflow-hidden">
            <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

            <div className={`flex-1 flex flex-col transition-all duration-500`}>
                {/* Pakai activeTitle yang sudah diupdate, bukan Header mentah */}
                <Navbar toggleSidebar={() => setIsOpen(!isOpen)} Header={activeTitle}/>
                <div className="flex-1 p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}