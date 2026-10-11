// src/components/manage/ManageProjects.tsx — admin kelola project: edit
// title/shortCall/deskripsi/status/priority/team/assigned users, hapus project.
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";
import { toast } from "sonner";
import type { AppUser, Project, Team } from "@/lib/types";

const STATUS = ["active", "archived"] as const;
const PRIORITY = ["low", "medium", "high"] as const;

export default function ManageProjects(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", shortCall: "", description: "", status: "active", priority: "medium", teamId: "",
  });
  const [assigned, setAssigned] = useState<string[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projList, teamList, userList] = await Promise.all([
          apiGet<Project[]>("/api/projects?scope=all"),
          apiGet<Team[]>("/api/teams"),
          apiGet<AppUser[]>("/api/users"),
        ]);
        if (!cancelled) {
          setProjects(projList);
          setTeams(teamList);
          setUsers(userList);
        }
      } catch {
        toast.error("Gagal memuat projects/teams/users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const userName = (id: string): string =>
    users.find((u) => u.id === id)?.name ?? id;

  const teamName = (id?: string): string =>
    teams.find((t) => t.id === id)?.name ?? "Tanpa tim";

  const startEdit = (p: Project): void => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      shortCall: p.shortCall ?? "",
      description: p.description ?? "",
      status: p.status ?? "active",
      priority: p.priority ?? "medium",
      teamId: p.teamId ?? "",
    });
    setAssigned(p.assignedUsers ?? []);
    setAddUserId("");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setAddUserId("");
  };

  const saveEdit = async (e: FormEvent, p: Project): Promise<void> => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/projects/${p.id}`, {
        title: form.title.trim(),
        shortCall: form.shortCall.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        teamId: form.teamId || null,
        assignedUsers: assigned,
      });
      const fresh = await apiGet<Project[]>("/api/projects?scope=all");
      setProjects(fresh);
      toast.success("Project diperbarui.");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (p: Project): Promise<void> => {
    if (!window.confirm(`Hapus project "${p.title}"? Semua lists/tasks/docs/discussions ikut terhapus.`)) return;
    try {
      await apiDelete(`/api/projects/${p.id}`);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Project dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  if (loading) return <CardSkeleton rows={4} />;
  if (!projects.length) return <EmptyState title="Belum ada project" hint="Buat project baru dari halaman Forms." actionLabel="Ke Forms" actionHref="/dashboard/forms" />;

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const isEditing = editingId === p.id;
        return (
          <Card key={p.id} className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.title}</span>
                <span className="text-white/50 font-normal text-xs">[{p.shortCall}]</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{p.status}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{p.priority}</span>
              </CardTitle>
              {!isEditing && (
                <p className="text-xs text-white/60">
                  {teamName(p.teamId)} · {(p.assignedUsers ?? []).length} assigned
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="space-y-2">
                  {p.description && <p className="text-xs text-white/60">{p.description}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => void removeProject(p)} className="text-red-300 border-red-500/30">Hapus</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => void saveEdit(e, p)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-white/70 text-xs">Title</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs">Short call</Label>
                      <Input value={form.shortCall} onChange={(e) => setForm({ ...form, shortCall: e.target.value })} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-white/70 text-xs">Deskripsi</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs">Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="bg-white/10 text-white border-white/20"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                          {STATUS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs">Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                        <SelectTrigger className="bg-white/10 text-white border-white/20"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                          {PRIORITY.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-white/70 text-xs">Team</Label>
                      <Select value={form.teamId || "__none"} onValueChange={(v) => setForm({ ...form, teamId: v === "__none" ? "" : v })}>
                        <SelectTrigger className="bg-white/10 text-white border-white/20"><SelectValue placeholder="Pilih team" /></SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                          <SelectItem value="__none">Tanpa tim</SelectItem>
                          {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs">Assigned users</Label>
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((uid) => (
                        <span key={uid} className="text-xs px-2 py-1 rounded-full bg-white/10 flex items-center gap-1">
                          {userName(uid)}
                          <button type="button" className="text-red-300 hover:text-red-200" onClick={() => setAssigned(assigned.filter((x) => x !== uid))}>×</button>
                        </span>
                      ))}
                      {!assigned.length && <span className="text-xs text-white/40">Belum ada yang di-assign</span>}
                    </div>
                    <div className="flex gap-2">
                      <Select value={addUserId} onValueChange={setAddUserId}>
                        <SelectTrigger className="bg-white/10 text-white border-white/20 flex-1"><SelectValue placeholder="Tambah user…" /></SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                          {users.filter((u) => !assigned.includes(u.id)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (addUserId && !assigned.includes(addUserId)) setAssigned([...assigned, addUserId]);
                          setAddUserId("");
                        }}
                      >
                        + Tambah
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
                    <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>Batal</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
