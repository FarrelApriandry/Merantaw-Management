import { useEffect, useState } from "react";
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TaskPage({ projectId }) {
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState("");

    // 🧩 fetch project info client-side
    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
        try {
            const snap = await getDoc(doc(db, "projects", projectId));
            if (snap.exists()) {
            setProject({ id: snap.id, ...snap.data() });
            } else {
            console.warn("TaskPage: project not found");
            console.log("projectId from Astro:", projectId);
            console.log("project snapshot:", snap.exists(), snap.data());
            }
        } catch (err) {
            console.error("TaskPage: Error fetching project:", err);
        }
        };

        fetchProject();
    }, [projectId]);

    // 🧩 realtime listener for tasks
    useEffect(() => {
        if (!projectId) return;

        const unsub = onSnapshot(
        collection(db, `projects/${projectId}/tasks`),
        (snapshot) => {
            const taskList = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            }));
            setTasks(taskList);
            setLoading(false);
        },
        (error) => {
            console.error("TaskPage: Error fetching tasks:", error);
            setLoading(false);
        }
        );

        return () => unsub();
    }, [projectId]);

    // 🧩 add task
    const handleAddTask = async () => {
        if (!newTask.trim()) return;
        try {
        await addDoc(collection(db, `projects/${projectId}/tasks`), {
            title: newTask,
            status: "todo",
            createdAt: serverTimestamp(),
        });
        setNewTask("");
        } catch (err) {
        console.error("Error adding task:", err);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6">
        <header className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-white">
            Tasks – {project ? project.shortCall || project.title : "Loading..."}
            </h1>
            <div className="flex gap-2">
            <input
                type="text"
                placeholder="Add new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
                onClick={handleAddTask}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg transition"
            >
                <Plus size={16} /> Add
            </button>
            </div>
        </header>

        {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} /> Loading tasks...
            </div>
        ) : tasks.length === 0 ? (
            <div className="text-gray-400">No tasks found</div>
        ) : (
            <motion.ul
            className="flex flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            >
            {tasks.map((task) => (
                <motion.li
                key={task.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-gray-200"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
                >
                <div className="flex justify-between items-center">
                    <span>{task.title}</span>
                    <span className="text-xs text-gray-400 uppercase">{task.status}</span>
                </div>
                </motion.li>
            ))}
            </motion.ul>
        )}
        </div>
    );
}
