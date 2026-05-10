import { useState } from "react";
import { updateTask } from "@/lib/firestore";
import { Input } from "@/components/ui/input";
import CategoryInput from "./CategoryInput";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Users, CalendarDays, Link as LinkIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditableTaskRow({
  task,
  members,
  projectId,
  listId,
  projectCategories = [],
  toggleSelect,
  selected,
}) {
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (field, value) => {
    try {
      setSaving(true);
      await updateTask(projectId, listId, task.id, { [field]: value });
      toast.success("Task updated!", { description: `${field} updated` });
    } catch (err) {
      toast.error("Failed to update", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAssigneeToggle = async (uid) => {
    const assigned = task.assignedTo || [];
    const newValue = assigned.includes(uid)
      ? assigned.filter((id) => id !== uid)
      : [...assigned, uid];
    await handleUpdate("assignedTo", newValue);
  };

  const assignedUsers = members.filter((m) => task.assignedTo?.includes(m.id)) || [];

  return (
    <motion.tr
      whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      transition={{ duration: 0.2 }}
    >
      {/* Checkbox */}
      <td className="px-4 py-2">
        <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} />
      </td>

      {/* Title */}
      <td className="px-4 py-2 text-left">
        <Popover>
          <PopoverTrigger asChild>
            <button className="truncate w-full text-left hover:underline hover:cursor-pointer">
              {task.title || "Untitled Task"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-[#1b1f3b] border border-white/10 text-white rounded-lg p-4">
            <div className="text-sm mb-2 font-medium">Edit Task Title</div>
            <Input
              defaultValue={task.title}
              onBlur={(e) => handleUpdate("title", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdate("title", e.target.value)}
              className="bg-transparent border-white/10 text-white"
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </td>

      {/* Category */}
      <td className="px-4 py-2 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-sm mx-auto hover:cursor-pointer">
              <Tag size={14} />
              {task.category?.length ? task.category.join(", ") : "No Category"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-[#1b1f3b] border border-white/10 rounded-lg p-4 text-white">
            <div className="text-sm mb-2 font-medium">Edit Categories</div>
            <CategoryInput
              value={task.category || []}
              onChange={(newCats) => handleUpdate("category", newCats)}
              suggestions={projectCategories || []}
            />
          </PopoverContent>
        </Popover>
      </td>

      {/* Assignee */}
      <td className="px-4 py-2 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-sm mx-auto hover:cursor-pointer">
              <Users size={14} />
              {assignedUsers.length > 0 ? assignedUsers.map((u) => u.name).join(", ") : "Unassigned"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-[#1b1f3b] text-white border border-white/10 rounded-lg shadow-md">
            <div className="p-2 text-sm font-medium border-b border-white/10 mb-2">Select Assignee(s)</div>
            <div className="flex flex-col gap-1">
              {members.map((m) => {
                const active = task.assignedTo?.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleAssigneeToggle(m.id)}
                    className={`text-left px-3 py-1 rounded-md transition ${
                      active ? "bg-blue-600/70 text-white" : "hover:bg-white/10 text-white/70"
                    }`}
                  >
                    {m.name || m.email}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Due Date */}
      <td className="px-4 py-2 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center justify-center gap-2 px-2 py-1 hover:bg-white/10 rounded-md text-sm w-full hover:cursor-pointer">
              <CalendarDays size={14} />
              {task.dueDate
                ? new Date(task.dueDate?.seconds ? task.dueDate.seconds * 1000 : task.dueDate).toLocaleDateString("id-ID")
                : "No Date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 bg-[#1b1f3b] border border-white/10 rounded-lg p-3 text-white">
            <div className="text-sm mb-2 font-medium">Set Due Date</div>
            <Input
              type="date"
              defaultValue={
                task.dueDate
                  ? new Date(task.dueDate?.seconds ? task.dueDate.seconds * 1000 : task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime())) handleUpdate("dueDate", newDate);
              }}
              className="bg-transparent border-white/10 text-white"
            />
          </PopoverContent>
        </Popover>
      </td>

      {/* Status */}
      <td className="px-4 py-2 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`px-2 py-1 rounded-full text-xs capitalize hover:cursor-pointer hover:scale-110 ${
                task.status === "done"
                  ? "bg-green-700/50 text-green-300"
                  : task.status === "in_progress"
                  ? "bg-yellow-700/50 text-yellow-300"
                  : task.status === "todo"
                  ? "bg-blue-700/50 text-blue-300"
                  : "bg-gray-700/50 text-gray-300"
              }`}
            >
              {task.status?.replace("_", " ")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 bg-[#1b1f3b] text-white border border-white/10 rounded-lg shadow-md">
            <div className="p-2 text-sm font-medium border-b border-white/10 mb-2">Change Status</div>
            <div className="flex flex-col gap-1">
              {["draft", "todo", "in_progress", "done"].map((status) => (
                <button
                  key={status}
                  onClick={() => handleUpdate("status", status)}
                  className={`px-3 py-1 rounded-md text-left capitalize transition ${
                    task.status === status ? "bg-blue-600/70 text-white" : "hover:bg-white/10 text-white/70"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Link */}
      <td className="px-4 py-2 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center justify-center gap-2 px-2 py-1 hover:bg-white/10 rounded-md text-sm w-full hover:cursor-pointer">
              <LinkIcon size={14} />
              {task.link ? "Open" : "Add link..."}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-[#1b1f3b] border border-white/10 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Manage Link</div>
              {task.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-white/20 text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                  onClick={() => window.open(task.link, "_blank")}
                >
                  Open
                </Button>
              )}
            </div>
            <Input
              type="url"
              defaultValue={task.link || ""}
              onBlur={(e) => handleUpdate("link", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdate("link", e.target.value)}
              className="bg-transparent border-white/10 text-white"
              placeholder="https://..."
            />
          </PopoverContent>
        </Popover>
      </td>

      {/* Action */}
      <td className="px-4 py-2 text-center text-sm">
        {saving ? (
          <Loader2 size={16} className="animate-spin mx-auto text-gray-400" />
        ) : (
          <Button variant="destructive" className="hover:underline">Detail</Button>
        )}
      </td>
    </motion.tr>
  );
}
