import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { onRepliesSnapshot, createReply, markAsSolution } from "@/lib/firestore";
import { toast } from "sonner";

export default function DiscussionThread({ projectId, discussion, currentUser, onBack }) {
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  const isAuthor = currentUser?.uid === discussion.authorId;

  useEffect(() => {
    const unsub = onRepliesSnapshot(projectId, discussion.id, setReplies);
    return () => unsub();
  }, [projectId, discussion.id]);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSending(true);
    await createReply(projectId, discussion.id, {
      content: replyContent.trim(),
      authorId: currentUser?.uid || "",
      authorName: currentUser?.name || currentUser?.email || "Anonymous",
    });
    setReplyContent("");
    setSending(false);
  };

  const handleMarkSolution = async (replyId) => {
    await markAsSolution(projectId, discussion.id, replyId);
    toast.success("Marked as solution!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh] flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{discussion.title}</h1>
          <p className="text-xs text-white/50">by {discussion.authorName}</p>
        </div>
        <Badge
          className={
            discussion.status === "solved"
              ? "bg-green-500/20 text-green-300"
              : "bg-blue-500/20 text-blue-300"
          }
        >
          {discussion.status === "solved" ? "Solved" : "Open"}
        </Badge>
      </header>

      {/* Original Post */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 mb-6">
        <article className="prose prose-invert prose-sm max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{discussion.content}</Markdown>
        </article>
      </div>

      {/* Replies */}
      <div className="flex-1 space-y-3 mb-6">
        <h2 className="text-sm text-white/50 font-medium">{replies.length} Replies</h2>
        <AnimatePresence>
          {replies.map((reply) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                reply.isSolution
                  ? "border-green-500/40 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">{reply.authorName}</span>
                <div className="flex items-center gap-2">
                  {reply.isSolution && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Badge className="bg-green-500/20 text-green-300 gap-1">
                        <CheckCircle2 size={12} /> Solution
                      </Badge>
                    </motion.div>
                  )}
                  {isAuthor && !reply.isSolution && (
                    <button
                      onClick={() => handleMarkSolution(reply.id)}
                      className="text-xs text-white/40 hover:text-green-400 transition"
                    >
                      Mark as Solution
                    </button>
                  )}
                </div>
              </div>
              <article className="prose prose-invert prose-sm max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>{reply.content}</Markdown>
              </article>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reply Input */}
      <div className="flex gap-3">
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Write a reply (Markdown supported)..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-mono resize-none focus:outline-none focus:border-blue-500/50 min-h-[80px]"
        />
        <Button onClick={handleReply} disabled={!replyContent.trim() || sending} className="self-end">
          <Send size={16} />
        </Button>
      </div>
    </motion.div>
  );
}
