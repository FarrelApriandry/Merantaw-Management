// src/pages/TeamsPage.jsx
import { useEffect, useState } from "react";
import { getProjects } from "@/lib/api/projects";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Briefcase, ShieldHalf } from "lucide-react";

export default function TeamsPage() {
    const [projects, setProject] = useState([]);

    useEffect(() => {
        async function fetchProjects() {
        const data = await getProjects();
        setProject(data);
        }
        fetchProjects();
    }, []);

    return (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
            <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            >
            <Card className="bg-gradient-to-br from-white/5 to-white/10 border-white/10 backdrop-blur-xl shadow-lg hover:shadow-[0_0_25px_rgba(0,200,255,0.2)] transition-all">
                <CardHeader>
                <CardTitle className="text-white">{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-white/80">
                <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-white/60" />
                    <span className="text-sm">{project.description}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-white/60" />
                    <span className="text-sm">{project.teamId}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm rounded-full bg-gray-700">{project.assignedUsers?.length || 0} Members</span>
                </div>
                </CardContent>
            </Card>
            </motion.div>
        ))}
        </div>
    );
}
