import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { X, Check } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import CategoryInput from "./CategoryInput"

export default function AddTaskRow({ projectMembers = [], projectCategories = [], onCancel, onAdd }) {
  const [title, setTitle] = useState("")
  const [assignedTo, setAssignedTo] = useState(projectMembers?.[0]?.id || "")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState("draft")
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!title.trim()) return "Title wajib diisi"
    if (!assignedTo) return "Assignee wajib dipilih"
    if (!dueDate) return "Due date wajib diisi"
    return null
  }

//   const parsedDate = new Date(dueDate)
// if (isNaN(parsedDate.getTime())) {
//   return toast.error("Tanggal tidak valid")
// }

  const handleSave = async () => {
    const v = validate()
    if (v) return toast.warning(v)

    setLoading(true)
    const payload = {
      title: title.trim(),
      assignedTo,
      dueDate: new Date(dueDate),
      status,
      link: "",
      category: categories,
    }

    try {
      await onAdd(payload)
        toast.success("Task berhasil ditambahkan!", { description: title })
        setTitle("")
        setAssignedTo(projectMembers?.[0]?.id || "")
        setDueDate("")
        setStatus("draft")
        setCategories([])
    } catch (err) {
      toast.error("Gagal menambahkan task", { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.tr
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg"
    >
      <td className="px-3 py-2" />
      <td className="px-3 py-2">
        <Input
          placeholder="Task title..."
          className="bg-transparent border-white/10 text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <CategoryInput
          value={categories}
          onChange={setCategories}
          suggestions={projectCategories}
        />
      </td>
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
      <td className="px-3 py-2">
        <Input
          type="date"
          className="bg-transparent border-white/10 text-white"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </td>
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
      <td className="px-3 py-2 text-sm text-white/50 italic">auto-fill later</td>
      <td className="px-3 py-2 flex gap-2">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          onClick={handleSave}
          disabled={loading}
        >
          <Check size={14} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-300 hover:text-white"
          onClick={onCancel}
          disabled={loading}
        >
          <X size={14} />
        </Button>
      </td>
    </motion.tr>
  )
}
