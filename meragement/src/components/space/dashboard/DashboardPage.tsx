import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, ListTodo, FileText, MessageCircle,
  BookOpen, List, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton, EmptyState } from "@/components/ui/feedback";
import type { Project, Task, SpaceList, DocItem, Discussion } from "@/lib/types";

interface Overview {
  project: Project;
  lists: (SpaceList & { taskCount: number })[];
  taskStats: { total: number; done: number; rate: number };
  docStats: { total: number; gdd: number; srs: number; wiki: number };
  discStats: { total: number; solved: number };
  recentDocs: Pick<DocItem, "id" | "title" | "category">[];
  recentDiscussions: Pick<Discussion, "id" | "title" | "status">[];
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export interface DashboardPageProps {
  projectId: string;
}

export default function DashboardPage({ projectId }: DashboardPageProps) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Satu panggilan /overview (poll 15s pengganti 1+N onSnapshot)
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const data = await apiGet<Overview>(`/api/projects/${projectId}/overview`);
        if (!cancelled) { setOverview(data); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [projectId]);

  const project = overview?.project ?? null;
  const taskStats = overview?.taskStats ?? { total: 0, done: 0, rate: 0 };
  const docStats = overview?.docStats ?? { total: 0, gdd: 0, srs: 0, wiki: 0 };
  const discStats = overview?.discStats ?? { total: 0, solved: 0 };
  const listCounts = overview?.lists ?? [];
  const recentDocs = overview?.recentDocs ?? [];
  const recentDiscussions = overview?.recentDiscussions ?? [];

  if (loading) {
    return (
      <div className="p-6 space-y-4" aria-busy="true" aria-label="Memuat dashboard…">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6 text-white"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-semibold">{project?.title}</h1>
        <p className="text-white/60 text-sm">{project?.description}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="secondary">{project?.shortCall}</Badge>
          <Badge className="bg-blue-500/20 text-blue-300">{project?.status}</Badge>
          <Badge className="bg-orange-500/20 text-orange-300">Priority: {project?.priority}</Badge>
        </div>
      </motion.div>

      {/* Top Row - 4 Stat Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={ListTodo}
          label="Total Tasks"
          value={taskStats.total}
          href={`/dashboard/space/${projectId}/tasks`}
        />
        <StatCard
          icon={CheckCircle}
          label="Completion"
          value={`${taskStats.rate}%`}
          href={`/dashboard/space/${projectId}/tasks`}
          color="text-green-400"
        />
        <StatCard
          icon={FileText}
          label="Total Docs"
          value={docStats.total}
          href={`/dashboard/space/${projectId}/docs`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Solved Threads"
          value={`${discStats.solved}/${discStats.total}`}
          href={`/dashboard/space/${projectId}/discussion`}
          color="text-green-400"
        />
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={fadeUp}>
        <Card className="bg-[#0D132B] border-white/10">
          <CardContent className="p-4">
            <div className="flex justify-between mb-2 text-sm">
              <span>Task Progress — {taskStats.rate}%</span>
              <span>{taskStats.done}/{taskStats.total} done</span>
            </div>
            <Progress value={taskStats.rate} />
          </CardContent>
        </Card>
      </motion.div>

      {/* 3-Column Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Active Lists */}
        <Card className="bg-[#0D132B] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/80 flex items-center gap-2">
              <List size={16} /> Active Lists
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {listCounts.length === 0 ? (
              <EmptyState title="Belum ada list" hint="List task akan muncul di sini." />
            ) : (
              listCounts.map((l) => (
                <a
                  key={l.id}
                  href={`/dashboard/space/${projectId}/tasks?list=${l.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <span className="text-sm">{l.name}</span>
                  <Badge className="bg-white/10 text-white/70 text-xs">{l.taskCount}</Badge>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        {/* Middle: Recent Docs */}
        <Card className="bg-[#0D132B] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/80 flex items-center gap-2">
              <BookOpen size={16} /> Latest Docs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDocs.length === 0 ? (
              <EmptyState title="Belum ada dokumen" />
            ) : (
              recentDocs.map((d) => (
                <a
                  key={d.id}
                  href={`/dashboard/space/${projectId}/docs`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <span className="text-sm truncate">{d.title}</span>
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs shrink-0">{d.category}</Badge>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Discussions */}
        <Card className="bg-[#0D132B] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/80 flex items-center gap-2">
              <MessageCircle size={16} /> Community Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDiscussions.length === 0 ? (
              <EmptyState title="Belum ada diskusi" />
            ) : (
              recentDiscussions.map((d) => (
                <a
                  key={d.id}
                  href={`/dashboard/space/${projectId}/discussion`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <span className="text-sm truncate">{d.title}</span>
                  <Badge
                    className={`text-xs shrink-0 ${
                      d.status === "solved"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {d.status === "solved" ? "Solved" : "Open"}
                  </Badge>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, href, color = "text-blue-400", danger }: { icon: ComponentType<{ size?: number | string; className?: string }>; label: string; value: ReactNode; href?: string; color?: string; danger?: boolean }) {
  return (
    <a href={href}>
      <Card className={`bg-[#0D132B] border-white/10 hover:bg-white/5 transition cursor-pointer ${danger ? "border-red-500/30" : ""}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <Icon size={20} className={danger ? "text-red-400" : color} />
          <div>
            <div className="text-lg font-semibold">{value}</div>
            <div className="text-xs text-white/60">{label}</div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
