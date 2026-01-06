import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export default function SidebarController({ children, Header }) {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTitle, setActiveTitle] = useState(Header);

    useEffect(() => {
        // Ambil ID dari URL secara client-side
        const pathParts = window.location.pathname.split('/');
        const spaceId = pathParts[pathParts.indexOf('space') + 1];

        if (spaceId) {
            // Listener ke Firestore buat ambil title project yang spesifik
            const unsub = onSnapshot(collection(db, "projects"), (snapshot) => {
                const currentProject = snapshot.docs.find(doc => doc.id === spaceId);
                if (currentProject) {
                    setActiveTitle("Project - " + currentProject.data().title);
                }
            });
            return () => unsub();
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