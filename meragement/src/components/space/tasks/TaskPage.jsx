// src/components/space/tasks/TaskPage.jsx
import { useEffect, useState, useCallback } from "react";
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
import { motion } from "framer-motion";
import { Trash2, Plus, SquareCheckBig } from "lucide-react";
import AddTaskRow from "./AddTaskRow";
import { toast } from "sonner";
import EditableTaskRow from "./EditableTaskRow";

export default function TaskPage({ projectId }) {
  const [serverTasks, setServerTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]); // 🧱 kategori unik dari task
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingRow, setCreatingRow] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // 🔹 Fetch project & members
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

  // 🔹 Realtime listener untuk tasks
  useEffect(() => {
    if (!projectId) return;
    const colRef = collection(db, `projects/${projectId}/tasks`);
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

      setServerTasks(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);

      // 🧱 Ambil kategori unik dari semua task
      const cats = [...new Set(list.flatMap((t) => t.category || []))];
      setProjectCategories(cats);
    });
    return () => unsub();
  }, [projectId]);

  // 🔹 Add Task dengan optimistik UI
  const handleAddOptimistic = useCallback(
    async (payload) => {
      const tempId = `tmp-${Date.now()}`;
      setPendingTasks((prev) => [
        { id: tempId, ...payload, optimistic: true },
        ...prev,
      ]);
      try {
        const ref = await addDoc(
          collection(db, `projects/${projectId}/tasks`),
          {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
        setPendingTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.success("Task added successfully!", {
          description: payload.title,
        });
        return ref.id;
      } catch (err) {
        console.error(err);
        toast.error("Failed to add task");
      }
    },
    [projectId]
  );

  // 🔹 Batch Delete Task
  const handleBatchDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;

    try {
      const batch = writeBatch(db);
      Array.from(selected).forEach((id) =>
        batch.delete(doc(db, `projects/${projectId}/tasks`, id))
      );
      await batch.commit();
      setSelected(new Set());
      toast.success("Tasks deleted successfully", {
        description: `${selected.size} deleted.`,
      });
    } catch (err) {
      toast.error("Failed to delete tasks", { description: err.message });
    }
  };

  // 🔹 Select toggle
  const toggleSelect = (taskId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });

  const combinedList = [...pendingTasks, ...serverTasks];

  // 🔹 Render UI
  return (
    <div className="p-6 bg-[#0D132B] rounded-xl shadow-xl border border-white/5 text-white">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide">
            Tasks – {project ? project.shortCall || project.title : projectId}
          </h1>
          <p className="text-sm text-white/60">{project?.description}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setCreatingRow((s) => !s)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> {creatingRow ? "Close" : "Add Task"}
          </Button>

          <Button
            variant="destructive"
            onClick={handleBatchDelete}
            disabled={!selected.size}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Trash2 size={16} /> Delete ({selected.size})
          </Button>
        </div>
      </header>

      <motion.div layout className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm rounded-lg">
          <thead className="bg-white/5 text-white/70 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 w-8 text-white/70">
                <SquareCheckBig size={16} />
              </th>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Assignee</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Link</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {/* 🟢 Add Task Bar */}
            {creatingRow && (
              <AddTaskRow
                projectMembers={members}
                projectCategories={projectCategories}
                onCancel={() => setCreatingRow(false)}
                onAdd={handleAddOptimistic}
              />
            )}

            {/* 🔄 Loading / Empty / Data */}
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-400">
                  Loading tasks...
                </td>
              </tr>
            ) : combinedList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-400">
                  No tasks found
                </td>
              </tr>
            ) : (
              combinedList.map((task) => (
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
