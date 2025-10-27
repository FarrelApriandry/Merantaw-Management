// src/components/dashboard/StatCard.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatCard({ icon, label, value }) {
    return (
        <motion.div
        whileHover={{ scale: 1.05, y: -3 }}
        transition={{ type: "spring", stiffness: 200 }}
        >
        <Card className="bg-gradient-to-br from-white/10 to-white/5 
                        border-white/10 backdrop-blur-xl 
                        text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]
                        hover:shadow-[0_0_25px_rgba(0,200,255,0.25)] 
                        transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">{label}</CardTitle>
            <div className="text-cyan-300">{icon}</div>
            </CardHeader>
            <CardContent>
            <div className="text-3xl font-bold">{value}</div>
            </CardContent>
        </Card>
        </motion.div>
    );
}
