// src/components/manage/ManageTeams.tsx — admin kelola team: edit
// nama/deskripsi/members (tambah/hapus member, edit roles), hapus team.
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
import type { AppUser, Team, TeamMember } from "@/lib/types";

interface TeamWithMembers extends Team {
  members: (TeamMember & { name?: string; email?: string })[];
}

export default function ManageTeams(): JSX.Element {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<{ userId: string; rolesText: string }[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamList, userList] = await Promise.all([
          apiGet<TeamWithMembers[]>("/api/teams"),
          apiGet<AppUser[]>("/api/users"),
        ]);
        if (!cancelled) {
          setTeams(teamList);
          setUsers(userList);
        }
      } catch {
        toast.error("Gagal memuat teams/users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const userName = (id: string): string =>
    users.find((u) => u.id === id)?.name ?? id;

  const startEdit = (t: TeamWithMembers): void => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description ?? "");
    setMembers((t.members ?? []).map((m) => ({ userId: m.userId, rolesText: (m.roles ?? []).join(", ") })));
    setAddUserId("");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setName("");
    setDescription("");
    setMembers([]);
    setAddUserId("");
  };

  const addMember = (): void => {
    if (!addUserId) return;
    if (members.some((m) => m.userId === addUserId)) {
      toast.info("User sudah jadi member.");
      return;
    }
    setMembers([...members, { userId: addUserId, rolesText: "" }]);
    setAddUserId("");
  };

  const saveEdit = async (e: FormEvent, t: TeamWithMembers): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama team wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch("/api/teams", {
        id: t.id,
        name: name.trim(),
        description: description.trim(),
        members: members.map((m) => ({
          userId: m.userId,
          roles: m.rolesText.split(",").map((r) => r.trim()).filter(Boolean),
        })),
      });
      const fresh = await apiGet<TeamWithMembers[]>("/api/teams");
      setTeams(fresh);
      toast.success("Team diperbarui.");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const removeTeam = async (t: TeamWithMembers): Promise<void> => {
    if (!window.confirm(`Hapus team "${t.name}"? Project yang pakai team ini jadi tanpa tim.`)) return;
    try {
      await apiDelete(`/api/teams?id=${t.id}`);
      setTeams((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Team dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  if (loading) return <CardSkeleton rows={4} />;
  if (!teams.length) return <EmptyState title="Belum ada team" hint="Buat team baru dari halaman Forms." actionLabel="Ke Forms" actionHref="/dashboard/forms" />;

  return (
    <div className="space-y-4">
      {teams.map((t) => {
        const isEditing = editingId === t.id;
        return (
          <Card key={t.id} className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{t.name}</span>
                <span className="text-white/50 font-normal text-xs">
                  {(t.members ?? []).length} member
                </span>
              </CardTitle>
              {t.description && !isEditing && (
                <p className="text-xs text-white/60">{t.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="space-y-2">
                  {(t.members ?? []).length > 0 && (
                    <ul className="text-xs text-white/70 space-y-1">
                      {(t.members ?? []).map((m) => (
                        <li key={m.userId}>
                          {m.name || userName(m.userId)}
                          {(m.roles ?? []).length > 0 && (
                            <span className="text-white/40"> — {(m.roles ?? []).join(", ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => void removeTeam(t)} className="text-red-300 border-red-500/30">Hapus</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => void saveEdit(e, t)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-white/70 text-xs">Nama team</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 text-white border-white/20" />
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs">Deskripsi</Label>
                      <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/10 text-white border-white/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs">Members (roles dipisah koma)</Label>
                    {members.map((m, i) => (
                      <div key={m.userId} className="flex gap-2 items-center">
                        <span className="text-xs w-32 truncate shrink-0">{userName(m.userId)}</span>
                        <Input
                          placeholder="roles: lead, dev…"
                          value={m.rolesText}
                          onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, rolesText: e.target.value } : x)))}
                          className="bg-white/10 text-white border-white/20 flex-1"
                        />
                        <Button type="button" size="sm" variant="outline" className="text-red-300 border-red-500/30" onClick={() => setMembers(members.filter((_, j) => j !== i))}>X</Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Select value={addUserId} onValueChange={setAddUserId}>
                        <SelectTrigger className="bg-white/10 text-white border-white/20 flex-1">
                          <SelectValue placeholder="Tambah user…" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                          {users.filter((u) => !members.some((m) => m.userId === u.id)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="outline" onClick={addMember}>+ Tambah</Button>
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
