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
import { useSmartPolling } from "@/lib/hooks/useSmartPolling";
import { useState, useEffect, useCallback, type JSX } from "react";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";
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

    interface DashboardSummary {
      projects: Project[];
      progressByProject: Record<string, number>;
      totalCount: number;
      doneCount: number;
      recentTasks: TaskWithProject[];
    }

    const userUid = user?.uid;

    const fetchData = useCallback(async (): Promise<void> => {
        if (!userUid) {
            setLoading(false);
            return;
        }
        try {
            setError(null);
            // 1 Panggilan agregat menggantikan 1 + N waterfall requests
            const data = await apiGet<DashboardSummary>("/api/dashboard/summary");
            setSpace(data.projects);
            setProgressByProject(data.progressByProject);
            setTotalCount(data.totalCount);
            setDoneCount(data.doneCount);
            setRecentTasks(data.recentTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [userUid]);

    useEffect(() => {
        if (!userUid) return;
        setLoading(true);
        void fetchData();
    }, [userUid, fetchData]);

    // Polling cerdas 60s: refresh otomatis saat tab aktif, pause saat tab background
    useSmartPolling(fetchData, {
        intervalMs: 60000,
        enabled: !!userUid,
    });

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
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/80"><Folder/>Projects</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    {loading && <CardSkeleton rows={3} />}
                    {!loading && space.length === 0 && (
                        <EmptyState
                            title="Belum ada project"
                            hint="Project muncul di sini setelah admin menambahkannya dan memasukkan kamu sebagai anggota."
                            actionLabel="Lihat semua Space"
                            actionHref="/dashboard/spaces"
                        />
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
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/80"><Check/>Recent Tasks</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    {loading && <CardSkeleton rows={4} />}
                    {!loading && recentTasks.length === 0 && (
                        <EmptyState
                            title="Belum ada task"
                            hint="Task dari project kamu akan muncul di sini."
                        />
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
