// src/components/layout/DashboardContent.tsx — P0: jangan dump users/projects.
// Hanya hitung scoped projects milik user + tanpa enumerasi email.
import {
    Users,
    Folder,
    Target,
    Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatCard from "../dashboard/StatCard";
import ProjectCard from "../dashboard/ProjectCard";
import TaskCard from "../dashboard/TaskCard";
import { getMyProjects } from "@/lib/api/projects";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useState, useEffect, type JSX } from "react";
import type { Project } from "@/lib/types";

export default function DashboardContent(): JSX.Element {

    const user = useCurrentUser();
    const [space, setSpace] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        const fetchData = async (): Promise<void> => {
            try {
                setLoading(true);
                // P0 scoped: hanya projects di mana user jadi member
                const spaceData = await getMyProjects(user.uid);
                setSpace(spaceData);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.uid]);

    void error;
    const activeSpace = space.filter((s) => s.status === "active").length;

    return (
        <div className="space-y-8">
        {/* --- Stats Section --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Users />} label="My Active Spaces" value={loading ? "..." : activeSpace.toString()} />
            <StatCard icon={<Folder />} label="Space" value={loading ? "..." : activeSpace.toString()} />
            <StatCard icon={<Target />} label="Goals Achieved" value="8" />
        </section>

        {/* --- Project & Task Section --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Folder/>Projects</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    <ProjectCard
                        title="Nusantara: Pasar Bubrah"
                        desc="Folklore Indonesian Game"
                        progress={100}
                    />
                    <ProjectCard
                        title="Another Realm"
                        desc="Indonesian Mythology Horror Game"
                        progress={60}
                    />
                    </div>
                </ScrollArea>
            </div>

            {/* Task List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Check/>Tasks</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    <TaskCard title="Connect Firebase" status="Done" assigned="Mint" />
                    <TaskCard title="Finalize UI Design" status="In Progress" assigned="Bayu" />
                    <TaskCard title="Fix Animation Bug" status="In Progress" assigned="Bayu" />
                    <TaskCard title="Set up Hosting" status="Pending" assigned="Andra" />
                    <TaskCard title="Testing Build" status="Pending" assigned="Mint" />
                    </div>
                </ScrollArea>
            </div>
        </section>
        </div>
    );
}
