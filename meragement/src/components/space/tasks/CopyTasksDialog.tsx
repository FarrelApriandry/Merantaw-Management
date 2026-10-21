import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Table as TableIcon,
  MessageSquareText,
  FileSpreadsheet,
  CheckSquare,
  ListFilter,
  Layers,
  Loader2,
} from "lucide-react";
import type { AppUser, Project, SpaceList, Task } from "@/lib/types";
import {
  taskToCopyItem,
  generateMarkdownTable,
  generateHtmlTable,
  generateTextList,
  generateCsv,
  copyTasksToClipboard,
  type CopyFormat,
  type CopyScope,
  type TaskCopyItem,
} from "@/lib/task-table-copy";

export interface CopyTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  projectId: string;
  lists: SpaceList[];
  activeList?: SpaceList;
  currentTasks: Task[];
  selectedTaskIds: Set<string>;
  members: AppUser[];
}

export default function CopyTasksDialog({
  open,
  onOpenChange,
  project,
  projectId,
  lists,
  activeList,
  currentTasks,
  selectedTaskIds,
  members,
}: CopyTasksDialogProps) {
  // Cakupan awal: jika ada yang dicentang di tabel, default ke "selected". Jika tidak, ke "active_list"
  const [scope, setScope] = useState<CopyScope>(
    selectedTaskIds.size > 0 ? "selected" : "active_list"
  );
  const [format, setFormat] = useState<CopyFormat>("markdown");
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [allSpaceTasks, setAllSpaceTasks] = useState<Task[] | null>(null);
  const [allSpaceLists, setAllSpaceLists] = useState<SpaceList[]>(lists);

  // Reset status copied dan sinkronkan scope saat dialog dibuka
  useEffect(() => {
    if (open) {
      setCopied(false);
      setScope(selectedTaskIds.size > 0 ? "selected" : "active_list");
    }
  }, [open, selectedTaskIds.size]);

  // Ambil semua task di space jika user memilih cakupan "all_space"
  useEffect(() => {
    if (open && scope === "all_space" && allSpaceTasks === null && !loadingAll) {
      let cancelled = false;
      setLoadingAll(true);
      (async () => {
        try {
          const res = await apiGet<{ lists: SpaceList[]; tasks: Task[] }>(
            `/api/projects/${projectId}/tasks`
          );
          if (cancelled) return;
          setAllSpaceTasks(res.tasks || []);
          if (res.lists && res.lists.length > 0) {
            setAllSpaceLists(res.lists);
          }
        } catch {
          if (!cancelled) {
            toast.error("Gagal memuat seluruh task space", {
              description: "Menggunakan task pada list saat ini sebagai cadangan.",
            });
            setScope("active_list");
          }
        } finally {
          if (!cancelled) setLoadingAll(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [open, scope, allSpaceTasks, projectId, loadingAll]);

  // Buat lookup map dari listId ke nama list
  const listNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const sourceLists = allSpaceLists.length > 0 ? allSpaceLists : lists;
    for (const l of sourceLists) {
      map.set(l.id, l.name);
    }
    return map;
  }, [allSpaceLists, lists]);

  // Filter tasks berdasarkan scope yang dipilih
  const targetTasks = useMemo(() => {
    if (scope === "selected") {
      return currentTasks.filter((t) => selectedTaskIds.has(t.id));
    }
    if (scope === "all_space") {
      return allSpaceTasks || [];
    }
    return currentTasks;
  }, [scope, selectedTaskIds, currentTasks, allSpaceTasks]);

  // Konversi tasks ke TaskCopyItem yang siap diformat
  const copyItems = useMemo<TaskCopyItem[]>(() => {
    const hasMultipleLists = scope === "all_space";
    return targetTasks.map((t, idx) => {
      const listName = t.listId ? listNameMap.get(t.listId) : activeList?.name;
      return taskToCopyItem(t, idx + 1, members, hasMultipleLists ? listName : undefined);
    });
  }, [targetTasks, members, scope, listNameMap, activeList?.name]);

  // Format teks pratinjau sesuai format yang dipilih
  const { plainText, htmlText } = useMemo(() => {
    const includeList = scope === "all_space";
    let plain = "";
    let html: string | undefined;

    if (format === "markdown") {
      plain = generateMarkdownTable(copyItems, { includeList });
      html = generateHtmlTable(copyItems, { includeList });
    } else if (format === "list") {
      plain = generateTextList(copyItems, {
        projectName: project?.title || project?.shortCall || undefined,
        listName: scope !== "all_space" ? activeList?.name : undefined,
      });
    } else if (format === "csv") {
      plain = generateCsv(copyItems, { includeList });
    }

    return { plainText: plain, htmlText: html };
  }, [copyItems, format, scope, project, activeList?.name]);

  // Jumlah baris dan karakter untuk indikator pratinjau
  const previewLines = useMemo(
    () => (plainText ? plainText.split("\n").length : 0),
    [plainText]
  );
  const previewChars = useMemo(() => plainText.length, [plainText]);

  // Handler eksekusi salin ke clipboard
  const handleCopy = async (): Promise<void> => {
    if (copyItems.length === 0) {
      toast.error("Tidak ada task untuk disalin");
      return;
    }

    try {
      const ok = await copyTasksToClipboard(plainText, htmlText);
      if (ok) {
        setCopied(true);
        toast.success(`Berhasil menyalin ${copyItems.length} task ke clipboard!`, {
          description:
            format === "markdown"
              ? "Format tabel rapi & siap ditempel di Excel, Sheets, Docs, atau Chat."
              : "Format teks siap ditempel di chat WhatsApp / Slack.",
        });
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error("Gagal menyalin ke clipboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menyalin", { description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D132B] border-white/10 text-white sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Copy size={20} className="text-blue-400" />
            Salin Tabel Tasks
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm">
            Salin data task dalam format tabel rapi yang mudah dibaca manusia dan kompatibel
            dengan Google Sheets, Excel, Docs, atau pesan chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto pr-1">
          {/* Pilihan Cakupan (Scope) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Cakupan Task
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedTaskIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setScope("selected")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    scope === "selected"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <CheckSquare size={14} />
                  Task Terpilih ({selectedTaskIds.size})
                </button>
              )}

              <button
                type="button"
                onClick={() => setScope("active_list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  scope === "active_list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <ListFilter size={14} />
                List Ini: {activeList?.name || "Aktif"} ({currentTasks.length})
              </button>

              <button
                type="button"
                onClick={() => setScope("all_space")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  scope === "all_space"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Layers size={14} />
                Semua List di Space{" "}
                {loadingAll
                  ? "(memuat...)"
                  : allSpaceTasks !== null
                  ? `(${allSpaceTasks.length})`
                  : ""}
              </button>
            </div>
          </div>

          {/* Pilihan Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Format Tampilan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat("markdown")}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  format === "markdown"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <TableIcon size={18} className="mt-0.5 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Tabel Markdown</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Kolom sejajar rapi & siap paste ke Sheets/Excel
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("list")}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  format === "list"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <MessageSquareText size={18} className="mt-0.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Daftar Teks Chat</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Poin-poin emoji ramah dibaca di WhatsApp/Slack
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  format === "csv"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileSpreadsheet size={18} className="mt-0.5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">CSV / Spreadsheet</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Format baris koma untuk import cepat
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Kotak Pratinjau Teks (Live Preview) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="font-semibold uppercase tracking-wider text-white/50">
                Pratinjau Hasil Salinan
              </span>
              <span>
                {previewLines} baris • {previewChars} karakter
              </span>
            </div>

            <div className="relative bg-[#070B19] border border-white/10 rounded-lg p-3 overflow-hidden">
              {loadingAll && scope === "all_space" ? (
                <div className="flex items-center justify-center py-12 gap-2 text-sm text-white/60">
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                  Memuat data seluruh tasks di space...
                </div>
              ) : copyItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-white/40">
                  Tidak ada task pada cakupan yang dipilih.
                </div>
              ) : (
                <pre className="font-mono text-xs text-white/90 overflow-x-auto max-h-56 p-1 leading-relaxed selection:bg-blue-600/40">
                  {plainText}
                </pre>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Tutup
          </Button>

          <Button
            type="button"
            disabled={copyItems.length === 0 || loadingAll}
            onClick={handleCopy}
            className={`transition-all ${
              copied
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {copied ? (
              <>
                <Check size={16} className="mr-1.5" />
                Tersalin ke Clipboard!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-1.5" />
                Salin ke Clipboard ({copyItems.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
