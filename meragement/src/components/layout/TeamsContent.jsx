// src/pages/TeamsPage.jsx
import { useEffect, useState } from "react";
import { getTeams } from "@/lib/api/teams";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Briefcase } from "lucide-react";

export default function TeamsPage() {
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        async function fetchTeams() {
        const data = await getTeams();
        setTeams(data);
        }
        fetchTeams();
    }, []);

    return (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
            <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            >
            <Card className="bg-gradient-to-br from-white/5 to-white/10 border-white/10 backdrop-blur-xl shadow-lg hover:shadow-[0_0_25px_rgba(0,200,255,0.2)] transition-all">
                <CardHeader>
                <CardTitle className="text-white">{team.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-white/80">
                <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-white/60" />
                    <span className="text-sm">{team.description}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-white/60" />
                    <span className="text-sm">{team.members?.length || 0} Members</span>
                </div>
                {/* List roles per member */}
                <div className="mt-2 flex flex-wrap gap-1">
                    {team.members?.map((member, idx) => (
                    <div key={idx} className="bg-white/10 text-white/90 rounded-md px-2 py-0.5 text-xs">
                        {member.roles.join(", ")}
                    </div>
                    ))}
                </div>
                </CardContent>
            </Card>
            </motion.div>
        ))}
        </div>
    );
}
