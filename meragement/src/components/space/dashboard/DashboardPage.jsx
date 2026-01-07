import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  ListTodo,
  AlertTriangle,
  Users,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage({ projectId }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userData") || "{}")
      : null;

  /* =========================
      FETCH PROJECT
  ========================== */
  useEffect(() => {
    if (!projectId) return;

    (async () => {
      const snap = await getDoc(doc(db, "projects", projectId));
      if (snap.exists()) {
        setProject({ id: snap.id, ...snap.data() });
      }
    })();
  }, [projectId]);

  /* =========================
      FETCH TASKS (REALTIME)
  ========================== */
  useEffect(() => {
    if (!projectId) return;

    const colRef = collection(db, `projects/${projectId}/tasks`);
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() || {}),
      }));
      setTasks(list);
      setLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  /* =========================
      DERIVED DATA
  ========================== */
  const now = Date.now();

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "draft" || t.status === "todo").length;
    const ongoing = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter(
      (t) =>
        t.dueDate?.seconds * 1000 < now && t.status !== "done"
    ).length;

    return { total, todo, ongoing, done, overdue };
  }, [tasks, now]);

  const progress =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const myTasks = useMemo(() => {
    if (!currentUser?.uid) return [];
    return tasks
      .filter((t) => t.assignedTo === currentUser.uid)
      .slice(0, 5);
  }, [tasks, currentUser]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.dueDate?.seconds * 1000 < now && t.status !== "done"
      )
      .slice(0, 5);
  }, [tasks, now]);

  if (loading) {
    return (
      <div className="p-6 text-white text-center">Loading dashboard...</div>
    );
  }

  /* =========================
      RENDER
  ========================== */
  return (
    <div className="p-6 space-y-6 text-white">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold tracking-wide">
          {project?.title}
        </h1>
        <p className="text-white/60 text-sm">{project?.description}</p>

        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="secondary">{project?.shortCall}</Badge>
          <Badge className="bg-blue-500/20 text-blue-300">
            {project?.status}
          </Badge>
          <Badge className="bg-orange-500/20 text-orange-300">
            Priority: {project?.priority}
          </Badge>
        </div>
      </div>

      {/* ================= OVERVIEW STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={ListTodo} label="Total" value={stats.total} />
        <StatCard icon={Clock} label="Todo" value={stats.todo} />
        <StatCard icon={Target} label="Ongoing" value={stats.ongoing} />
        <StatCard icon={CheckCircle} label="Done" value={stats.done} />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          danger
        />
      </div>

      {/* ================= PROGRESS ================= */}
      <Card className="bg-[#0D132B] border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-white/80">
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-2 text-sm">
            <span>{progress}% completed</span>
            <span>
              {stats.done}/{stats.total} tasks
            </span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {/* ================= TASK LIST ================= */}
      <Tabs defaultValue="my">
        <TabsList className="bg-white/5">
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          <TaskList tasks={myTasks} emptyText="You have no assigned tasks" />
        </TabsContent>

        <TabsContent value="overdue">
          <TaskList
            tasks={overdueTasks}
            emptyText="No overdue tasks"
            danger
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =========================
    SMALL COMPONENTS
========================= */

function StatCard({ icon: Icon, label, value, danger }) {
  return (
    <motion.div layout>
      <Card
        className={`bg-[#0D132B] border-white/10 ${
          danger ? "border-red-500/30" : ""
        }`}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <Icon
            size={20}
            className={danger ? "text-red-400" : "text-blue-400"}
          />
          <div>
            <div className="text-lg font-semibold">{value}</div>
            <div className="text-xs text-white/60">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TaskList({ tasks, emptyText, danger }) {
  if (!tasks.length) {
    return (
      <div className="text-sm text-white/50 mt-4">{emptyText}</div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className={`p-3 rounded-lg border text-sm flex justify-between items-center
          ${
            danger
              ? "border-red-500/30 bg-red-500/5"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div>
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-white/50">{t.status}</div>
          </div>

          {t.dueDate && (
            <div className="text-xs text-white/60">
              {new Date(t.dueDate.seconds * 1000).toLocaleDateString("id-ID")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
