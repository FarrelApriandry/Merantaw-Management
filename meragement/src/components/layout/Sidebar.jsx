// Sidebar.jsx
import {
    Home, Inbox, Users, FileText, Calendar, Target,
    MessageCircle, Folder, ChevronDown, ChevronLeft, Earth,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminProtector } from "../auth/PagesProtector";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function Sidebar({ isOpen, toggleSidebar }) {
    const user = useCurrentUser();
    const isAdmin = user?.role === "admin";
    const [spaces, setSpaces] = useState([]);
    const [openSpaces, setOpenSpaces] = useState({});
    const [currentPath, setCurrentPath] = useState("");
    const [loadingSpaces, setLoadingSpaces] = useState(true);
    const [spacesError, setSpacesError] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentPath(window.location.pathname);
        }
    
        const auth = getAuth();
    
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                setSpaces([]);
                setLoadingSpaces(false);
                return;
            }
    
            try {
                const userData = user; // dari useCurrentUser
                const userRole = userData?.role || "user";
    
                // 🔹 Kalau admin → ambil semua projects
                const q =
                    userRole === "admin"
                        ? collection(db, "projects")
                        : query(
                            collection(db, "projects"),
                            where("assignedUsers", "array-contains", firebaseUser.uid)
                        );
    
                const unsubSnapshot = onSnapshot(
                    q,
                    (snapshot) => {
                        const projectList = snapshot.docs.map((doc) => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                shortCall: data?.shortCall || "N/A",
                                title: data?.title || "(no title)",
                            };
                        });
                        setSpaces(projectList);
                        setSpacesError(null);
                        setLoadingSpaces(false);
                    },
                    (error) => {
                        setSpaces([]);
                        setSpacesError(error);
                        setLoadingSpaces(false);
                    }
                );
    
                return () => unsubSnapshot();
            } catch (err) {
                console.error("Sidebar: unexpected error setting up query:", err);
                setSpaces([]);
                setSpacesError(err);
                setLoadingSpaces(false);
            }
        });
    
        return () => unsubscribeAuth();
    }, [user]);    

    const toggleSpace = (id) => {
        setOpenSpaces((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <motion.aside
            animate={{ width: isOpen ? 256 : 80 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-screen bg-gradient-to-b from-white/10 to-white/5 
                    backdrop-blur-2xl border-r border-white/10 
                    shadow-[0_0_20px_rgba(255,255,255,0.05)] 
                    relative flex flex-col p-4 overflow-y-auto"
        >
            {/* Collapse button */}
            <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-6 bg-white/10 border border-white/10 
                        rounded-full p-1.5 hover:bg-white/20 transition"
            >
            <ChevronLeft size={16} className={`transition-transform ${isOpen ? "" : "rotate-180"}`} />
            </button>
    
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 mt-2 justify-center">
            <motion.img
                src="/LogoMTW.svg"
                alt="Logo"
                className="w-9 h-9 drop-shadow-lg"
                whileHover={{ rotate: 10, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 200 }}
            />
            <AnimatePresence>
                {isOpen && (
                <motion.h1
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                >
                    Meragement
                </motion.h1>
                )}
            </AnimatePresence>
            </div>
    
            {/* Navigation */}
            <nav className="flex flex-col gap-1.5">
            <NavItem icon={<Home size={18} />} label="Home" href="/dashboard" isOpen={isOpen} currentPath={currentPath} />
            <NavItem icon={<Users size={18} />} label="Teams" href="/dashboard/teams" isOpen={isOpen} currentPath={currentPath} />
            <NavItem icon={<Earth size={18} />} label="Space" href="/dashboard/spaces" isOpen={isOpen} currentPath={currentPath} />
            {isAdmin && <NavItem icon={<Inbox size={18} />} label="Inbox" href="/dashboard/inbox" isOpen={isOpen} currentPath={currentPath} />}
            {isAdmin && <NavItem icon={<FileText size={18} />} label="Forms" href="/dashboard/forms" isOpen={isOpen} currentPath={currentPath} />}
            <NavItem icon={<Calendar size={18} />} label="Calendar" href="/dashboard/calendar" isOpen={isOpen} currentPath={currentPath} />
            <NavItem icon={<Target size={18} />} label="Milestone" href="/dashboard/milestone" isOpen={isOpen} currentPath={currentPath} />
            <NavItem icon={<MessageCircle size={18} />} label="Discussion" href="/dashboard/discussion" isOpen={isOpen} currentPath={currentPath} />
    
            {/* Dynamic Space Dropdowns */}
            <div className="mt-3">
                {loadingSpaces && (
                <div className="px-3 py-2 text-sm text-gray-400">{isOpen ? "Loading spaces..." : "..."}</div>
                )}
    
                {!loadingSpaces && spacesError && (
                <div className="px-3 py-2 text-sm text-red-400">Error loading spaces (see console)</div>
                )}
    
                {!loadingSpaces && !spaces.length && !spacesError && (
                <div className="px-3 py-2 text-sm text-gray-400">{isOpen ? "No spaces found" : "—"}</div>
                )}
    
                {spaces.map((space) => (
                <div key={space.id}>
                    <button
                    onClick={() => toggleSpace(space.id)}
                    className="flex justify-between items-center w-full px-3 py-2 rounded-lg text-gray-300 hover:text-white
                                    hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-400/10 
                                    transition-all duration-200 group relative"
                    >
                    <span className="flex items-center gap-3">
                        <Folder size={18} />
                        {isOpen && <span>Space ({space.shortCall})</span>}
                    </span>
                    {isOpen && (
                        <ChevronDown
                        size={16}
                        className={`transition-transform ${openSpaces[space.id] ? "rotate-180" : ""}`}
                        />
                    )}
                    </button>
    
                    <AnimatePresence>
                    {openSpaces[space.id] && isOpen && (
                        <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="ml-6 mt-2 flex flex-col gap-1"
                        >
                        <NavItem label="Dashboard Project" href={`/dashboard/space/${space.id}`} isOpen={isOpen} currentPath={currentPath} />
                        <NavItem label="Task" href={`/dashboard/space/${space.id}/tasks`} isOpen={isOpen} currentPath={currentPath} />
                        <NavItem label="Discussion" href={`/dashboard/space/${space.id}/discussion`} isOpen={isOpen} currentPath={currentPath} />
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
                ))}
            </div>
            </nav>
        </motion.aside>
    );
}

function NavItem({ icon, label, href, isOpen, currentPath }) {
    const isActive = currentPath === href;

    return (
        <a
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 transition-all duration-200 group relative
                ${isActive ? "text-white bg-gradient-to-r from-blue-500/20 to-cyan-400/10 shadow-[0_0_15px_rgba(0,200,255,0.2)]" : "hover:text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-400/10"}
                `}
        >
            <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition"></span>
            <div className="relative flex items-center gap-3">
            {icon}
            {isOpen && <span>{label}</span>}
            </div>
        </a>
    );
}
