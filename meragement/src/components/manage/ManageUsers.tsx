// src/components/manage/ManageUsers.tsx — admin kelola user: edit
// name/email/role, aktif-nonaktif, reset password. Tanpa hapus (sesuai request).
// Guard ganda: AdminProtector di content + requireAdmin di API.
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { apiGet, apiPatch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";
import { toast } from "sonner";
import type { AppUser } from "@/lib/types";

const ROLES = ["admin", "member", "investor"] as const;

interface EditState {
  name: string;
  email: string;
  role: string;
  newPassword: string;
}

export default function ManageUsers(): JSX.Element {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>({ name: "", email: "", role: "member", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = async (): Promise<void> => {
    try {
      const rows = await apiGet<AppUser[]>("/api/admin/users");
      setUsers(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (u: AppUser): void => {
    setEditingId(u.id);
    setEdit({ name: u.name ?? "", email: u.email, role: u.role, newPassword: "" });
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEdit({ name: "", email: "", role: "member", newPassword: "" });
  };

  const saveEdit = async (e: FormEvent, u: AppUser): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (edit.name.trim() !== (u.name ?? "")) payload.name = edit.name.trim();
      if (edit.email.trim().toLowerCase() !== u.email.toLowerCase()) payload.email = edit.email.trim();
      if (edit.role !== u.role) payload.role = edit.role;
      if (edit.newPassword) {
        if (edit.newPassword.length < 8) {
          toast.error("Password baru min 8 karakter.");
          setSaving(false);
          return;
        }
        payload.password = edit.newPassword;
      }
      if (!Object.keys(payload).length) {
        toast.info("Tidak ada perubahan.");
        setSaving(false);
        return;
      }
      payload.id = u.id;
      const updated = await apiPatch<AppUser>("/api/admin/users", payload);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      toast.success("User diperbarui.");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: AppUser): Promise<void> => {
    try {
      const updated = await apiPatch<AppUser>("/api/admin/users", {
        id: u.id,
        isActive: !(u.isActive !== false),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      toast.success(updated.isActive !== false ? "User diaktifkan." : "User dinonaktifkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) return <CardSkeleton rows={5} />;
  if (!users.length) return <EmptyState title="Belum ada user" />;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Cari nama / email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-white/10 text-white border-white/20 max-w-sm"
      />
      {filtered.length === 0 && <EmptyState title="User tidak ditemukan" hint="Coba ubah kata kunci pencarian." />}
      {filtered.map((u) => {
        const active = u.isActive !== false;
        const isEditing = editingId === u.id;
        return (
          <Card key={u.id} className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{u.name || "(tanpa nama)"}</span>
                <span className="text-white/50 font-normal">{u.email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-purple-500/20 text-purple-300" : u.role === "investor" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>
                  {u.role}
                </span>
                {!active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">nonaktif</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => startEdit(u)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void toggleActive(u)}
                    className={active ? "text-red-300 border-red-500/30" : "text-green-300 border-green-500/30"}
                  >
                    {active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => void saveEdit(e, u)} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-white/70 text-xs">Nama</Label>
                    <Input
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className="bg-white/10 text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs">Email</Label>
                    <Input
                      type="email"
                      value={edit.email}
                      onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                      className="bg-white/10 text-white border-white/20"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs">Role</Label>
                    <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v })}>
                      <SelectTrigger className="bg-white/10 text-white border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white">
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs">Password baru (opsional)</Label>
                    <Input
                      type="password"
                      placeholder="min 8 karakter"
                      value={edit.newPassword}
                      onChange={(e) => setEdit({ ...edit, newPassword: e.target.value })}
                      className="bg-white/10 text-white border-white/20"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Menyimpan…" : "Simpan"}
                    </Button>
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
