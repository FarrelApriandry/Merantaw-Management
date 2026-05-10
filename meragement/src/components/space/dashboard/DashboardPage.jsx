import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { onListsSnapshot, onDocsSnapshot, onDiscussionsSnapshot } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, ListTodo, FileText, MessageCircle,
  BookOpen, List, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function DashboardPage({ projectId }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [docs, setDocs] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksByList, setTasksByList] = useState({});

  // Fetch project
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const snap = await getDoc(doc(db, "projects", projectId));
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() });
    })();
  }, [projectId]);

  // Fetch lists + tasks
  useEffect(() => {
    if (!projectId) return;
    let listUnsubs = [];

    const unsubLists = onListsSnapshot(projectId, (fetchedLists) => {
      setLists(fetchedLists);
      listUnsubs.forEach((u) => u());
      listUnsubs = [];

      if (!fetchedLists.length) { setTasks([]); setLoading(false); return; }

      const byList = {};
      fetchedLists.forEach((list) => {
        const colRef = collection(db, `projects/${projectId}/lists/${list.id}/tasks`);
        const unsub = onSnapshot(colRef, (snap) => {
          byList[list.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTasksByList({ ...byList });
          setTasks(Object.values(byList).flat());
          setLoading(false);
        });
        listUnsubs.push(unsub);
      });
    });

    return () => { unsubLists(); listUnsubs.forEach((u) => u()); };
  }, [projectId]);

  // Fetch docs
  useEffect(() => {
    if (!projectId) return;
    return onDocsSnapshot(projectId, setDocs);
  }, [projectId]);

  // Fetch discussions
  useEffect(() => {
    if (!projectId) return;
    return onDiscussionsSnapshot(projectId, setDiscussions);
  }, [projectId]);

  // Aggregated stats
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  const docStats = useMemo(() => ({
    total: docs.length,
    gdd: docs.filter((d) => d.category === "GDD").length,
    srs: docs.filter((d) => d.category === "SRS").length,
    wiki: docs.filter((d) => d.category === "Wiki").length,
  }), [docs]);

  const discStats = useMemo(() => ({
    total: discussions.length,
    solved: discussions.filter((d) => d.status === "solved").length,
  }), [discussions]);

  const recentDocs = useMemo(() => docs.slice(0, 5), [docs]);
  const recentDiscussions = useMemo(() => discussions.slice(0, 5), [discussions]);

  const listCounts = useMemo(() =>
    lists.map((l) => ({ ...l, count: (tasksByList[l.id] || []).length })),
  [lists, tasksByList]);

  if (loading) {
    return <div className="p-6 text-white text-center">Loading dashboard...</div>;
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
              <p className="text-xs text-white/40">No lists yet</p>
            ) : (
              listCounts.map((l) => (
                <a
                  key={l.id}
                  href={`/dashboard/space/${projectId}/tasks?list=${l.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <span className="text-sm">{l.name}</span>
                  <Badge className="bg-white/10 text-white/70 text-xs">{l.count}</Badge>
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
              <p className="text-xs text-white/40">No documents yet</p>
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
              <p className="text-xs text-white/40">No discussions yet</p>
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

function StatCard({ icon: Icon, label, value, href, color = "text-blue-400", danger }) {
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
