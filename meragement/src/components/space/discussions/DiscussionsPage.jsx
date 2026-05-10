import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { onDiscussionsSnapshot, createDiscussion } from "@/lib/firestore";
import DiscussionThread from "./DiscussionThread";

export default function DiscussionsPage({ projectId }) {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userData") || "{}")
      : {};

  useEffect(() => {
    if (!projectId) return;
    const unsub = onDiscussionsSnapshot(projectId, (list) => {
      setDiscussions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createDiscussion(projectId, {
      title: newTitle.trim(),
      content: newContent.trim(),
      authorId: currentUser?.uid || "",
      authorName: currentUser?.name || currentUser?.email || "Anonymous",
    });
    setNewTitle("");
    setNewContent("");
    setCreateOpen(false);
  };

  if (activeThread) {
    return (
      <DiscussionThread
        projectId={projectId}
        discussion={activeThread}
        currentUser={currentUser}
        onBack={() => setActiveThread(null)}
      />
    );
  }

  return (
    <div className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh]">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discussions</h1>
          <p className="text-sm text-white/60">Ask questions, share ideas, find solutions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Thread
        </Button>
      </header>

      {loading ? (
        <p className="text-white/50 text-center py-10">Loading...</p>
      ) : discussions.length === 0 ? (
        <p className="text-white/50 text-center py-10">No discussions yet</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {discussions.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveThread(d)}
                className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition cursor-pointer flex items-center gap-4"
              >
                <div className="shrink-0">
                  {d.status === "solved" ? (
                    <CheckCircle2 size={22} className="text-green-400" />
                  ) : (
                    <MessageCircle size={22} className="text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{d.title}</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    by {d.authorName} · {d.replyCount || 0} replies
                  </p>
                </div>
                <Badge
                  className={
                    d.status === "solved"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-blue-500/20 text-blue-300"
                  }
                >
                  {d.status === "solved" ? "Solved" : "Open"}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0D132B] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="What's your question or topic?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-transparent border-white/10 text-white"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown supported)</Label>
              <textarea
                placeholder="Describe your question or idea..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full min-h-[150px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-mono resize-none focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || !newContent.trim()}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
