// src/components/layout/ManageContent.tsx — halaman Manage (admin only):
// 3 tab Users | Teams | Projects. Guard: AdminProtector + requireAdmin di API.
import { useState, type JSX } from "react";
import ManageUsers from "@/components/manage/ManageUsers";
import ManageTeams from "@/components/manage/ManageTeams";
import ManageProjects from "@/components/manage/ManageProjects";
import { Button } from "@/components/ui/button";
import { AdminProtector } from "@/components/auth/PagesProtector";

type ActiveTab = "users" | "teams" | "projects";

export default function ManageContent(): JSX.Element {
  const [tab, setTab] = useState<ActiveTab>("users");
  const { isUserAdmin, checking } = AdminProtector();

  if (checking) {
    return (
      <div className="space-y-3 max-w-md mx-auto" aria-busy="true" aria-label="Memeriksa izin…">
        <div className="animate-pulse rounded-lg bg-white/10 h-10 w-full" />
        <div className="animate-pulse rounded-lg bg-white/10 h-40 w-full" />
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-sm">
        Akses ditolak — hanya admin yang boleh membuka halaman Manage.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 justify-center">
        <Button variant={tab === "users" ? "default" : "outline"} onClick={() => setTab("users")}>
          Users
        </Button>
        <Button variant={tab === "teams" ? "default" : "outline"} onClick={() => setTab("teams")}>
          Teams
        </Button>
        <Button variant={tab === "projects" ? "default" : "outline"} onClick={() => setTab("projects")}>
          Projects
        </Button>
      </div>
      {tab === "users" && <ManageUsers />}
      {tab === "teams" && <ManageTeams />}
      {tab === "projects" && <ManageProjects />}
    </div>
  );
}
