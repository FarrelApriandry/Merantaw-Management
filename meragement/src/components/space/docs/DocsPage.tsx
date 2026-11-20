import { toast } from "sonner";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { useSmartPolling } from "@/lib/hooks/useSmartPolling";
import { useSpaceEvents } from "@/lib/hooks/useSpaceEvents";
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
import type { DocItem, FirestoreTimestampLike } from "@/lib/types";
import { toDateSafe } from "@/lib/types";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";

const CATEGORIES = ["GDD", "SRS", "Wiki", "Meeting Notes", "Other"];

export interface DocsPageProps {
  projectId: string;
}

export default function DocsPage({ projectId }: DocsPageProps) {
  const readOnly = useCurrentUser()?.role === "investor";
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);
  const [filterCat, setFilterCat] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Wiki");

  const docsRef = useRef<DocItem[]>([]);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  // Baca query parameter doc / id dari URL browser
  const getDocIdFromUrl = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("doc") || params.get("id");
  }, []);

  const openDoc = useCallback((doc: DocItem) => {
    setActiveDoc(doc);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", doc.id);
      window.history.pushState({ docId: doc.id }, "", url);
    }
  }, []);

  const handleBack = useCallback(() => {
    setActiveDoc(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("doc");
      url.searchParams.delete("id");
      window.history.pushState({}, "", url);
    }
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const list = await apiGet<DocItem[]>(`/api/projects/${projectId}/docs`);
      setDocs(list);
      docsRef.current = list;

      // Sinkronkan activeDoc dengan URL query string
      const docId = getDocIdFromUrl();
      if (docId) {
        const found = list.find((d) => d.id === docId);
        if (found) {
          setActiveDoc((prev) => (prev?.id === found.id ? prev : found));
        } else {
          // Jika tidak ada di list lokal, coba fetch satu doc via API spesifik
          try {
            const single = await apiGet<DocItem>(`/api/projects/${projectId}/docs/${docId}`);
            if (single) {
              setActiveDoc(single);
            }
          } catch {
            // Jika dokumen tidak valid atau sudah dihapus, bersihkan query param
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("doc");
              url.searchParams.delete("id");
              window.history.replaceState({}, "", url);
            }
            setActiveDoc(null);
          }
        }
      }
    } catch {
      /* abaikan */
    } finally {
      setLoading(false);
    }
  }, [projectId, getDocIdFromUrl]);

  useEffect(() => {
    if (!projectId) return;
    void load();
  }, [projectId, load]);

  // Handle navigasi tombol back/forward di browser
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = () => {
      const docId = getDocIdFromUrl();
      if (!docId) {
        setActiveDoc(null);
      } else {
        const found = docsRef.current.find((d) => d.id === docId);
        if (found) {
          setActiveDoc(found);
        } else {
          apiGet<DocItem>(`/api/projects/${projectId}/docs/${docId}`)
            .then((single) => {
              if (single) setActiveDoc(single);
            })
            .catch(() => setActiveDoc(null));
        }
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [projectId, getDocIdFromUrl]);

  // Fallback poll cerdas 45s (pause saat tab hidden)
  useSmartPolling(load, { intervalMs: 45000, enabled: !!projectId });

  // Realtime update via SSE
  useSpaceEvents({ projectId, onChange: () => void load() });

  const filtered = docs.filter((d) => {
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async (): Promise<void> => {
    if (!newTitle.trim()) return;
    try {
      const content = getTemplate(newCategory, newTitle.trim());
      const ref = await apiPost<{ id: string }>(`/api/projects/${projectId}/docs`, {
        title: newTitle.trim(),
        content,
        category: newCategory,
      });
      setNewTitle("");
      setCreateOpen(false);
      // Refetch supaya grid list sinkron (updatedAt, urutan) dengan server.
      await load();
      openDoc({ id: ref.id, title: newTitle.trim(), content, category: newCategory });
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleDelete = async (docId: string): Promise<void> => {
    if (!confirm(`Delete this document?`)) return;
    try {
      await apiDelete(`/api/projects/${projectId}/docs/${docId}`);
      // Refetch; filter state lokal langsung jadi tidak relevan kalau perlu.
      await load();
      if (activeDoc?.id === docId) {
        handleBack();
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (activeDoc) {
    return (
      <DocEditor
        projectId={projectId}
        doc={activeDoc}
        readOnly={readOnly}
        onBack={handleBack}
        onSaved={load}
      />
    );
  }

  // Jika URL memiliki param doc saat sedang memuat awal, tampilkan skeleton loading agar tidak kedip grid
  if (loading && getDocIdFromUrl()) {
    return (
      <div className="p-4 md:p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh] flex items-center justify-center">
        <div className="w-64 space-y-3" aria-busy="true" aria-label="Memuat dokumen…">
          <div className="animate-pulse rounded-lg bg-white/10 h-6 w-2/3 mx-auto" />
          <div className="animate-pulse rounded-lg bg-white/10 h-4 w-full" />
          <div className="animate-pulse rounded-lg bg-white/10 h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh]">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Docs</h1>
          <p className="text-sm text-white/60">Knowledge base & documentation</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={readOnly} title={readOnly ? "Investor hanya bisa memantau" : undefined}>
          <Plus size={16} /> New Doc
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative w-full sm:w-64">
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
        <CardSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Dokumen tidak ditemukan"
          hint="Coba ubah kata kunci atau kategori filter."
        />
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
                onClick={() => openDoc(d)}
              >
                <div className="flex items-start justify-between mb-2">
                  <FileText size={20} className="text-blue-400 shrink-0" />
                  {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                  )}
                </div>
                <h3 className="font-medium truncate mb-1">{d.title}</h3>
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs">{d.category}</Badge>
                  <span className="text-xs text-white/40">
                    {(() => {
                      const dd = toDateSafe(d.updatedAt as FirestoreTimestampLike);
                      return dd ? dd.toLocaleDateString("id-ID") : "—";
                    })()}
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
