// src/components/dashboard/ProjectCard.jsx
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FolderKanban } from "lucide-react";

export default function ProjectCard({ title, desc, progress }) {

    const progressColor =
        progress === 100
        ? "text-green-400"
        : "text-gray-400";

    return (
        <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.3 }}>
        <Card className="h-full bg-gradient-to-br from-white/10 to-white/5 
                        border-white/10 backdrop-blur-xl 
                        text-white shadow-[0_0_25px_rgba(0,0,0,0.3)]
                        hover:shadow-[0_0_30px_rgba(0,200,255,0.25)] 
                        transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center gap-2 text-cyan-300">
            <FolderKanban size={18} />
            <CardTitle className="font-semibold text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">{desc}</p>

            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
                />
            </div>

            <p className={`text-xs ${progressColor} text-right`}>{progress}% Complete</p>
            </CardContent>
        </Card>
        </motion.div>
    );
}
