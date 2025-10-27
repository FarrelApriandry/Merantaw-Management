// src/components/dashboard/TaskCard.jsx
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function TaskCard({ title, status, assigned }) {
    const statusColor =
        status === "Done"
        ? "text-green-400"
        : status === "In Progress"
        ? "text-yellow-400"
        : "text-gray-400";

    return (
        <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
        <Card className="bg-gradient-to-br from-white/10 to-white/5 py-0
                        border-white/10 backdrop-blur-xl 
                        text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]
                        hover:shadow-[0_0_25px_rgba(0,200,255,0.25)] 
                        transition-all duration-300">
            <CardContent className="flex items-center justify-between py-2">
            <div>
                <h4 className="font-semibold">{title}</h4>
                <p className={`text-sm ${statusColor}`}>{status}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={18} className={`${statusColor}`} />
                <span className={`text-sm ${statusColor}`}>{assigned}</span>
            </div>
            </CardContent>
        </Card>
        </motion.div>
    );
}
