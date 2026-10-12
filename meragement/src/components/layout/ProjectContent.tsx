// src/components/layout/ProjectContent.tsx — daftar projects via /api.
// Sekalian tampilkan nama team (bukan raw teamId) — temuan audit integrasi.
import { useEffect, useState, type JSX } from "react";
import { apiGet } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Briefcase } from "lucide-react";
import type { Project } from "@/lib/types";

interface Team { id: string; name: string }

export default function TeamsPage(): JSX.Element {
    const user = useCurrentUser();
    const [projects, setProject] = useState<Project[]>([]);
    const [teamNames, setTeamNames] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        (async () => {
            try {
                const scope = user.role === "admin" ? "all" : "mine";
                const [data, teamRows] = await Promise.all([
                    apiGet<Project[]>(`/api/projects?scope=${scope}`),
                    apiGet<Team[]>("/api/teams").catch(() => [] as Team[]),
                ]);
                if (cancelled) return;
                setProject(data);
                const map: Record<string, string> = {};
                for (const t of teamRows) map[t.id] = t.name;
                setTeamNames(map);
            } catch {
                if (!cancelled) setProject([]);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.uid, user?.role]);

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {projects.map((project) => (
            <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            >
            <a href={`/dashboard/space/${project.id}`}>
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
                    <span className="text-sm">{(project.teamId && teamNames[project.teamId]) || <span className="text-white/40">Tanpa tim</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm rounded-full bg-gray-700 px-2 py-0.5">{project.assignedUsers?.length || 0} Members</span>
                    <span className="text-xs rounded-full bg-white/10 px-2 py-0.5 capitalize">{project.status}</span>
                </div>
                </CardContent>
            </Card>
            </a>
            </motion.div>
        ))}
        </div>
    );
}
