import { useEffect, useState, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { onTasksSnapshot, onListsSnapshot, createTask, batchDeleteTasks } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, SquareCheckBig, Search, List } from "lucide-react";
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

export default function TaskPage({ projectId }) {
  const [serverTasks, setServerTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingRow, setCreatingRow] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    due: "",
    assignee: "",
  });

  // Read listId from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const listParam = params.get("list");
    if (listParam) setActiveListId(listParam);
  }, []);

  // Fetch project & members
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
      setMembers(
        results.filter((r) => r.exists()).map((r) => ({ id: r.id, ...(r.data() || {}) }))
      );
    })();
  }, [projectId]);

  // Subscribe to lists
  useEffect(() => {
    if (!projectId) return;
    const unsub = onListsSnapshot(projectId, (data) => {
      setLists(data);
      // Auto-select first list if none selected
      if (!activeListId && data.length > 0) {
        setActiveListId(data[0].id);
      }
    });
    return () => unsub();
  }, [projectId]);

  // Realtime tasks scoped to activeListId
  useEffect(() => {
    if (!projectId || !activeListId) {
      setServerTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onTasksSnapshot(projectId, activeListId, (taskList) => {
      setServerTasks(taskList);
      setLoading(false);
      const cats = [...new Set(taskList.flatMap((t) => t.category || []))];
      setProjectCategories(cats);
    });
    return () => unsub();
  }, [projectId, activeListId]);

  // Switch list
  const switchList = (listId) => {
    setActiveListId(listId);
    setSelected(new Set());
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("list", listId);
      window.history.replaceState({}, "", url);
    }
  };

  // Add task
  const handleAddOptimistic = useCallback(
    async (payload) => {
      if (!activeListId) return toast.error("Select a list first");
      const tempId = `tmp-${Date.now()}`;
      setPendingTasks((prev) => [{ id: tempId, ...payload }, ...prev]);

      try {
        await createTask(projectId, activeListId, payload);
        setPendingTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.success("Task added");
      } catch {
        toast.error("Failed to add task");
      }
    },
    [projectId, activeListId]
  );

  // Batch delete
  const handleBatchDelete = async () => {
    if (!selected.size || !activeListId) return;
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    await batchDeleteTasks(projectId, activeListId, Array.from(selected));
    setSelected(new Set());
    toast.success("Tasks deleted");
  };

  const toggleSelect = (taskId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });

  const combinedList = [...pendingTasks, ...serverTasks];

  // Filter engine
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return combinedList.filter((task) => {
      if (filters.search && !task.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.assignee) {
        if (filters.assignee === "unassigned") {
          if (task.assignedTo?.length) return false;
        } else {
          if (!task.assignedTo?.includes(filters.assignee)) return false;
        }
      }
      if (filters.category && !task.category?.includes(filters.category)) return false;
      if (filters.due && task.dueDate?.seconds) {
        const due = new Date(task.dueDate.seconds * 1000);
        if (filters.due === "overdue" && due >= now) return false;
        if (filters.due === "today" && due.toDateString() !== now.toDateString()) return false;
        if (filters.due === "week" && (due < now || due > new Date(now.getTime() + 7 * 86400000))) return false;
      }
      return true;
    });
  }, [combinedList, filters]);

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white">
      {/* HEADER */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Tasks – {project?.shortCall || projectId}
        </h1>
        <p className="text-sm text-white/60">{project?.description}</p>
      </header>

      {/* LIST TABS */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => switchList(list.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeListId === list.id
                ? "bg-blue-600/30 text-white border border-blue-500/40"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
            }`}
          >
            <List size={14} />
            {list.name}
          </button>
        ))}
        {lists.length === 0 && !loading && (
          <p className="text-sm text-white/40">No lists yet. Create one from the sidebar.</p>
        )}
      </div>

      {/* FILTER BAR */}
      <AnimatePresence mode="wait">
        {activeListId && (
          <motion.div
            key={activeListId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 text-white/40" size={14} />
                <Input
                  placeholder="Search tasks"
                  className="pl-7 bg-transparent border-white/10"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>

              <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-40 bg-transparent border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-[#1b1f3b] text-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="todo">todo</SelectItem>
                  <SelectItem value="in_progress">in progress</SelectItem>
                  <SelectItem value="done">done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.assignee} onValueChange={(v) => setFilters((f) => ({ ...f, assignee: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-44 bg-transparent border-white/10"><SelectValue placeholder="Assignee" /></SelectTrigger>
                <SelectContent className="bg-[#1b1f3b] text-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-44 bg-transparent border-white/10"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent className="bg-[#1b1f3b] text-white">
                  <SelectItem value="all">All</SelectItem>
                  {projectCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.due} onValueChange={(v) => setFilters((f) => ({ ...f, due: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-36 bg-transparent border-white/10"><SelectValue placeholder="Due Date" /></SelectTrigger>
                <SelectContent className="bg-[#1b1f3b] text-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2 mb-4">
              <Button onClick={() => setCreatingRow((s) => !s)}>
                <Plus size={16} /> Add Task
              </Button>
              <Button variant="destructive" disabled={!selected.size} onClick={handleBatchDelete}>
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
                        listId={activeListId}
                        projectCategories={projectCategories}
                        toggleSelect={toggleSelect}
                        selected={selected}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
