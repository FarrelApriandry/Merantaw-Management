// src/components/layout/DashboardContent.tsx — data real dari /api/projects (+ agregat tasks).
// Menggantikan dummy hardcoded (ProjectCard/TaskCard statis) + Firestore getMyProjects.
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
import { apiGet } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useState, useEffect, type JSX } from "react";
import type { Project, Task } from "@/lib/types";

interface TaskWithProject extends Task {
  projectTitle?: string;
}

export default function DashboardContent(): JSX.Element {

    const user = useCurrentUser();
    const [space, setSpace] = useState<Project[]>([]);
    const [recentTasks, setRecentTasks] = useState<TaskWithProject[]>([]);
    const [doneCount, setDoneCount] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [progressByProject, setProgressByProject] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        const fetchData = async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);
                const scope = user.role === "admin" ? "all" : "mine";
                const spaceData = await apiGet<Project[]>(`/api/projects?scope=${scope}`);
                if (cancelled) return;
                setSpace(spaceData);

                // Agregat tasks lintas project untuk progress + recent list
                const per: TaskWithProject[][] = await Promise.all(
                    spaceData.map(async (p) => {
                        try {
                            const d = await apiGet<{ tasks: Task[] }>(`/api/projects/${p.id}/tasks`);
                            return (d.tasks ?? []).map((t) => ({ ...t, projectTitle: p.title }));
                        } catch {
                            return [];
                        }
                    }),
                );
                if (cancelled) return;
                const all = per.flat();
                const prog: Record<string, number> = {};
                for (const p of spaceData) {
                    const mine = all.filter((t) => (t as { listId?: string } && (t.projectTitle === p.title)));
                    const done = mine.filter((t) => t.status === "done").length;
                    prog[p.id] = mine.length ? Math.round((done / mine.length) * 100) : 0;
                }
                setProgressByProject(prog);
                setTotalCount(all.length);
                setDoneCount(all.filter((t) => t.status === "done").length);
                const sorted = [...all].sort((a, b) => {
                    const da = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
                    const dbb = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
                    return dbb - da;
                });
                setRecentTasks(sorted.slice(0, 10));
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchData();
        return () => { cancelled = true; };
    }, [user?.uid, user?.role]);

    const activeSpace = space.filter((s) => s.status === "active").length;
    const rate = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-8">
        {/* --- Stats Section --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Users />} label="My Active Spaces" value={loading ? "..." : activeSpace.toString()} />
            <StatCard icon={<Folder />} label="Tasks Done" value={loading ? "..." : `${doneCount}/${totalCount}`} />
            <StatCard icon={<Target />} label="Completion Rate" value={loading ? "..." : `${rate}%`} />
        </section>

        {error && (
            <div className="text-red-300 text-sm rounded-xl border border-red-500/20 bg-red-500/5 p-3">{error}</div>
        )}

        {/* --- Project & Task Section --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Folder/>Projects</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    {loading && <p className="text-sm text-white/40">Loading…</p>}
                    {!loading && space.length === 0 && (
                        <p className="text-sm text-white/40">No projects yet</p>
                    )}
                    {space.map((p) => (
                        <ProjectCard
                            key={p.id}
                            title={p.title}
                            desc={p.description || p.shortCall || ""}
                            progress={progressByProject[p.id] ?? 0}
                        />
                    ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Task List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Check/>Recent Tasks</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    {loading && <p className="text-sm text-white/40">Loading…</p>}
                    {!loading && recentTasks.length === 0 && (
                        <p className="text-sm text-white/40">No tasks yet</p>
                    )}
                    {recentTasks.map((t) => {
                        const label =
                            t.status === "done" ? "Done"
                            : t.status === "in_progress" ? "In Progress"
                            : t.status === "todo" ? "To Do"
                            : "Draft";
                        return (
                        <TaskCard
                            key={t.id}
                            title={t.projectTitle ? `${t.title} · ${t.projectTitle}` : t.title}
                            status={label}
                            assigned={Array.isArray(t.assignedTo) ? `${t.assignedTo.length} assignee(s)` : "Unassigned"}
                        />
                        );
                    })}
                    </div>
                </ScrollArea>
            </div>
        </section>
        </div>
    );
}
