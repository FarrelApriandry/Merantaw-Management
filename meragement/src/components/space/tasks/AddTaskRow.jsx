// src/components/space/tasks/AddTaskRow.jsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AddTaskRow({ projectMembers = [], onCancel, onAdd }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState(projectMembers?.[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const validate = () => {
    if (!title.trim()) return "Title wajib diisi";
    if (!assignedTo) return "Assignee wajib dipilih";
    if (!dueDate) return "Due date wajib diisi";
    if (!status) return "Status wajib dipilih";
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) {
      setErrorMsg(v);
      toast.warning(v);
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    const payload = {
      title: title.trim(),
      assignedTo,
      dueDate: new Date(dueDate),
      status,
      link: "",
    };
    try {
      await onAdd(payload);
      toast.success("Task berhasil ditambahkan!", { description: title });
      setTitle("");
      setAssignedTo(projectMembers?.[0]?.id || "");
      setDueDate("");
      setStatus("todo");
    } catch (err) {
      console.error("AddTaskRow: onAdd failed", err);
      toast.error("Gagal menambahkan task", { description: err.message });
      setErrorMsg(err?.message || "Gagal menambahkan task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg"
    >
      <td className="px-3 py-2"></td>

      {/* Task Title */}
      <td className="px-3 py-2">
        <Input
          placeholder="Task title..."
          className="bg-transparent border-white/10 focus-visible:ring-blue-500 text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </td>

      {/* Assignee */}
      <td className="px-3 py-2">
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="bg-transparent border-white/10 text-white">
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent className="bg-[#1b1f3b] text-white border-white/10">
            {projectMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Due Date */}
      <td className="px-3 py-2">
        <Input
          type="date"
          className="bg-transparent border-white/10 focus-visible:ring-blue-500 text-white"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-transparent border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1b1f3b] text-white border-white/10">
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Link Column Placeholder */}
      <td className="px-3 py-2 text-sm text-white/50 italic">auto-fill later</td>

      {/* Actions */}
      <td className="px-3 py-2 flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          onClick={handleSave}
          disabled={loading}
        >
          <Check size={14} />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-300 hover:text-white"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={14} />
          Cancel
        </Button>
      </td>
    </motion.tr>
  );
}
