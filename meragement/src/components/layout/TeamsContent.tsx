// src/components/layout/TeamsContent.tsx — daftar teams via /api/teams.
// Menampilkan nama member (bukan cuma roles) — temuan audit integrasi.
import { useEffect, useState, type JSX } from "react";
import { apiGet } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Briefcase } from "lucide-react";

interface TeamMemberView {
  userId: string;
  roles: string[];
  name?: string;
  email?: string;
}

interface TeamView {
  id: string;
  name: string;
  description?: string;
  members?: TeamMemberView[];
}

export default function TeamsPage(): JSX.Element {
    const [teams, setTeams] = useState<TeamView[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGet<TeamView[]>("/api/teams");
                if (!cancelled) setTeams(data);
            } catch {
                if (!cancelled) setTeams([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                {/* List member: nama + roles */}
                <div className="mt-2 flex flex-wrap gap-1">
                    {team.members?.map((member, idx) => (
                    <div key={idx} className="bg-white/10 text-white/90 rounded-md px-2 py-0.5 text-xs">
                        {member.name || member.email || member.userId}
                        {member.roles.length > 0 && ` (${member.roles.join(", ")})`}
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
