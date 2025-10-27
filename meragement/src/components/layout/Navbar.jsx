import { useState, useEffect, useRef } from "react";
import { Grip, Bell, UserRound, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({ toggleSidebar, Header }) {
    const [openUserCard, setOpenUserCard] = useState(false);
    const [userData, setUserData] = useState(null);
    const cardRef = useRef();

    // Ambil userData dari localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("userData");
        if (storedUser) setUserData(JSON.parse(storedUser));
    }, []);

    // Tutup card kalau klik di luar
    useEffect(() => {
        function handleClickOutside(e) {
        if (cardRef.current && !cardRef.current.contains(e.target)) {
            setOpenUserCard(false);
        }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("userData");
        window.location.href = "/auth/login";
    };

    return (
        <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex justify-between items-center px-6 py-4 
                    bg-gradient-to-r from-white/10 via-white/5 to-transparent
                    border-b border-white/10 backdrop-blur-2xl
                    shadow-[0_0_25px_rgba(0,0,0,0.25)] sticky top-0 z-40"
        >
        <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
            {Header}
            </h2>
        </div>

        <div className="flex items-center gap-3 relative">
            <ActionButton icon={<Grip size={16} />} />
            <ActionButton icon={<Bell size={16} />} />
            <motion.button
            onClick={() => setOpenUserCard(!openUserCard)}
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-2 py-1.5 
                        bg-gradient-to-r from-blue-500/30 to-cyan-400/20 
                        hover:from-blue-500/40 hover:to-cyan-400/30 
                        rounded-full border border-white/10 cursor-pointer relative z-50"
            >
            <UserRound size={16} className="text-gray-200" />
            <ChevronDown size={12} className="text-gray-200" />
            </motion.button>

            {/* User Card */}
            <AnimatePresence>
            {openUserCard && userData && (
                <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-lg p-4 text-white z-50"
                >
                <div className="mb-3">
                    <div className="font-semibold">{userData.name}</div>
                    <div className="text-sm text-white/70">{userData.email}</div>
                    <div className="text-sm text-white/50">Status: {userData.status}</div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-white text-sm font-medium"
                >
                    Logout
                </button>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
        </motion.header>
    );
}

function ActionButton({ icon }) {
    return (
        <motion.button
        whileHover={{ scale: 1.15, rotate: 10 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all"
        >
        {icon}
        </motion.button>
    );
}
