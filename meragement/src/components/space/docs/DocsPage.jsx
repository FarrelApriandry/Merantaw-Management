import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { onDocsSnapshot, createDoc, deleteDocument } from "@/lib/firestore";
import DocEditor from "./DocEditor";
import { getTemplate } from "./templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CATEGORIES = ["GDD", "SRS", "Wiki", "Meeting Notes", "Other"];

export default function DocsPage({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Wiki");

  useEffect(() => {
    if (!projectId) return;
    const unsub = onDocsSnapshot(projectId, (list) => {
      setDocs(list);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const filtered = docs.filter((d) => {
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const content = getTemplate(newCategory, newTitle.trim());
    const ref = await createDoc(projectId, {
      title: newTitle.trim(),
      content,
      category: newCategory,
      updatedBy: "",
    });
    setNewTitle("");
    setCreateOpen(false);
    setActiveDoc({ id: ref.id, title: newTitle.trim(), content, category: newCategory });
  };

  const handleDelete = async (docId) => {
    if (!confirm(`Delete this document?`)) return;
    await deleteDocument(projectId, docId);
    if (activeDoc?.id === docId) setActiveDoc(null);
  };

  if (activeDoc) {
    return (
      <DocEditor
        projectId={projectId}
        doc={activeDoc}
        onBack={() => setActiveDoc(null)}
      />
    );
  }

  return (
    <div className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh]">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Docs</h1>
          <p className="text-sm text-white/60">Knowledge base & documentation</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Doc
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 text-white/40" size={14} />
          <Input
            placeholder="Search docs..."
            className="pl-7 bg-transparent border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCat("")}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${!filterCat ? "bg-blue-600/30 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${filterCat === cat ? "bg-blue-600/30 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Doc Grid */}
      {loading ? (
        <p className="text-white/50 text-center py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/50 text-center py-10">No documents found</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition cursor-pointer group"
                onClick={() => setActiveDoc(d)}
              >
                <div className="flex items-start justify-between mb-2">
                  <FileText size={20} className="text-blue-400 shrink-0" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-medium truncate mb-1">{d.title}</h3>
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs">{d.category}</Badge>
                  <span className="text-xs text-white/40">
                    {d.updatedAt?.seconds
                      ? new Date(d.updatedAt.seconds * 1000).toLocaleDateString("id-ID")
                      : "—"}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0D132B] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Document title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-transparent border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="bg-transparent border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1f3b] text-white">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
