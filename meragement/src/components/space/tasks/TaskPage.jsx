// src/components/space/tasks/TaskPage.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Trash2,
  Plus,
  SquareCheckBig,
  Search,
} from "lucide-react";
import AddTaskRow from "./AddTaskRow";
import EditableTaskRow from "./EditableTaskRow";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ============================= */

export default function TaskPage({ projectId }) {
  const [serverTasks, setServerTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingRow, setCreatingRow] = useState(false);
  const [selected, setSelected] = useState(new Set());

  /* 🔹 FILTER STATE (FINAL) */
  const [filters, setFilters] = useState({
    search: "",
    status: "",     // "" = all
    category: "",   // "" = all
    due: "",        // "" = all
    assigne: "",    // "" = all
  });

  /* ============================= */
  /* 🔹 Fetch project & members */
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const snap = await getDoc(doc(db, "projects", projectId));
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setProject(data);

      const ids = data.assignedUsers || [];
      const results = await Promise.all(
        ids.map((uid) => getDoc(doc(db, "users", uid)))
      );
      const users = results
        .filter((r) => r.exists())
        .map((r) => ({ id: r.id, ...(r.data() || {}) }));
      setMembers(users);
    })();
  }, [projectId]);

  /* ============================= */
  /* 🔹 Realtime tasks */
  useEffect(() => {
    if (!projectId) return;
    const colRef = collection(db, `projects/${projectId}/tasks`);
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setServerTasks(list);
      setLoading(false);

      const cats = [...new Set(list.flatMap((t) => t.category || []))];
      setProjectCategories(cats);
    });
    return () => unsub();
  }, [projectId]);

  /* ============================= */
  /* 🔹 Add task */
  const handleAddOptimistic = useCallback(
    async (payload) => {
      const tempId = `tmp-${Date.now()}`;
      setPendingTasks((prev) => [{ id: tempId, ...payload }, ...prev]);

      try {
        await addDoc(collection(db, `projects/${projectId}/tasks`), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setPendingTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.success("Task added");
      } catch {
        toast.error("Failed to add task");
      }
    },
    [projectId]
  );

  /* ============================= */
  /* 🔹 Batch delete */
  const handleBatchDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;

    const batch = writeBatch(db);
    Array.from(selected).forEach((id) =>
      batch.delete(doc(db, `projects/${projectId}/tasks`, id))
    );
    await batch.commit();
    setSelected(new Set());
    toast.success("Tasks deleted");
  };

  const toggleSelect = (taskId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });

  /* ============================= */
  const combinedList = [...pendingTasks, ...serverTasks];

  /* 🔥 FILTER ENGINE (FINAL) */
  const filteredTasks = useMemo(() => {
    const now = new Date();

    return combinedList.filter((task) => {
      if (
        filters.search &&
        !task.title?.toLowerCase().includes(filters.search.toLowerCase())
      ) return false;

      if (filters.status && task.status !== filters.status)
        return false;

      // Assignee filter
      if (filters.assignee) {
        // Unassigned
        if (filters.assignee === "unassigned") {
          if (task.assignedTo?.length) return false;
        } 
        // Assigned to specific user
        else {
          if (!task.assignedTo?.includes(filters.assignee)) return false;
        }
      }

      if (
        filters.category &&
        !task.category?.includes(filters.category)
      ) return false;

      if (filters.due && task.dueDate?.seconds) {
        const due = new Date(task.dueDate.seconds * 1000);

        if (filters.due === "overdue" && due >= now) return false;
        if (
          filters.due === "today" &&
          due.toDateString() !== now.toDateString()
        ) return false;
        if (
          filters.due === "week" &&
          (due < now || due > new Date(now.getTime() + 7 * 86400000))
        ) return false;
      }

      return true;
    });
  }, [combinedList, filters]);

  /* ============================= */
  return (
    <div className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white">
      {/* HEADER */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Tasks – {project?.shortCall || projectId}
        </h1>
        <p className="text-sm text-white/60">{project?.description}</p>
      </header>

      {/* 🔍 FILTER BAR */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 text-white/40" size={14} />
          <Input
            placeholder="Search tasks"
            className="pl-7 bg-transparent border-white/10"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-40 bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1b1f3b] text-white">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
            <SelectItem value="todo">todo</SelectItem>
            <SelectItem value="in_progress">in progress</SelectItem>
            <SelectItem value="done">done</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee */}
        <Select
          value={filters.assignee}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, assignee: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-44 bg-transparent border-white/10">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>

          <SelectContent className="bg-[#1b1f3b] text-white">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>

            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={filters.category}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, category: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-44 bg-transparent border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-[#1b1f3b] text-white">
            <SelectItem value="all">All</SelectItem>
            {projectCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Due */}
        <Select
          value={filters.due}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, due: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-36 bg-transparent border-white/10">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent className="bg-[#1b1f3b] text-white">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ACTION */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setCreatingRow((s) => !s)}>
          <Plus size={16} /> Add Task
        </Button>
        <Button
          variant="destructive"
          disabled={!selected.size}
          onClick={handleBatchDelete}
        >
          <Trash2 size={16} /> Delete ({selected.size})
        </Button>
      </div>

      {/* TABLE */}
      <motion.div layout className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-2"><SquareCheckBig size={16} /></th>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Assignee</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Link</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {creatingRow && (
              <AddTaskRow
                projectMembers={members}
                projectCategories={projectCategories}
                onCancel={() => setCreatingRow(false)}
                onAdd={handleAddOptimistic}
              />
            )}

            {loading ? (
              <tr><td colSpan={8} className="py-4 text-center">Loading…</td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={8} className="py-4 text-center">No tasks found</td></tr>
            ) : (
              filteredTasks.map((task) => (
                <EditableTaskRow
                  key={task.id}
                  task={task}
                  members={members}
                  projectId={projectId}
                  projectCategories={projectCategories}
                  toggleSelect={toggleSelect}
                  selected={selected}
                />
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
