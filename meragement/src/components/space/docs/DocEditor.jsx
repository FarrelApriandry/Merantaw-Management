import { useState, useCallback, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateDocContent } from "@/lib/firestore";
import { toast } from "sonner";

export default function DocEditor({ projectId, doc, onBack }) {
  const [content, setContent] = useState(doc.content || "");
  const [mode, setMode] = useState("split"); // split | edit | preview
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  const save = useCallback(async (text) => {
    setSaving(true);
    try {
      await updateDocContent(projectId, doc.id, { content: text });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [projectId, doc.id]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    // Auto-save debounce 1.5s
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(val), 1500);
  };

  const handleManualSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(content);
    toast.success("Saved");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh] flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{doc.title}</h1>
            <Badge className="bg-blue-500/20 text-blue-300 text-xs">{doc.category}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-white/40">Saving...</span>}
          {/* Mode toggles */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setMode("edit")}
              className={`px-2 py-1 rounded text-xs transition ${mode === "edit" ? "bg-white/10 text-white" : "text-white/50"}`}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setMode("split")}
              className={`px-2 py-1 rounded text-xs transition ${mode === "split" ? "bg-white/10 text-white" : "text-white/50"}`}
            >
              Split
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-2 py-1 rounded text-xs transition ${mode === "preview" ? "bg-white/10 text-white" : "text-white/50"}`}
            >
              <Eye size={12} />
            </button>
          </div>
          <Button size="sm" onClick={handleManualSave}>
            <Save size={14} /> Save
          </Button>
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Textarea */}
        {mode !== "preview" && (
          <div className={`flex flex-col ${mode === "split" ? "w-1/2" : "w-full"}`}>
            <textarea
              value={content}
              onChange={handleChange}
              className="flex-1 w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white font-mono resize-none focus:outline-none focus:border-blue-500/50 min-h-[60vh]"
              placeholder="Write markdown here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {mode !== "edit" && (
          <div className={`overflow-y-auto ${mode === "split" ? "w-1/2" : "w-full"} bg-white/5 border border-white/10 rounded-lg p-6 min-h-[60vh]`}>
            <article className="prose prose-invert prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </article>
          </div>
        )}
      </div>
    </motion.div>
  );
}
