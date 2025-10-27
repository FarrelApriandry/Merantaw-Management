// src/components/layout/SidebarController.jsx
import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function SidebarController({ children, Header}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-[#0D132B] text-white overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

        {/* Main content */}
        <div
            className={`flex-1 flex flex-col transition-all duration-500`}
        >
            <Navbar toggleSidebar={() => setIsOpen(!isOpen)} Header={Header}/>
            <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        </div>
        </div>
    );
}
