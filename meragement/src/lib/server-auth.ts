// src/lib/server-auth.ts — helper auth server-side untuk API routes (Astro SSR).
// Pengganti firestore.rules: setiap rule read/write diterjemahkan jadi fungsi
// di sini, dipanggil eksplisit di tiap route. Fail-closed: null = tolak (401/403).
import { auth } from "./auth";
import { db } from "./db";
import { projects } from "./db/schema";
import { eq } from "drizzle-orm";

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export async function requireUser(request: Request): Promise<ServerUser | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const u = session?.user as
      | { id: string; email: string; name: string; role?: string; isActive?: boolean }
      | undefined;
    if (!u?.id) return null;
    if (u.isActive === false) return null;
    return {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      role: u.role ?? "member",
      isActive: u.isActive ?? true,
    };
  } catch {
    return null;
  }
}

export function isAdmin(u: ServerUser | null): boolean {
  return !!u && u.role === "admin" && u.isActive !== false;
}

// Investor: read-only per project yang dia di-assign. Tidak boleh write apa pun.
export function isInvestor(u: ServerUser | null): boolean {
  return !!u && u.role === "investor" && u.isActive !== false;
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

export type ProjectRow = typeof projects.$inferSelect;

export async function getProjectRow(projectId: string): Promise<ProjectRow | null> {
  if (!isUuid(projectId)) return null;
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return rows[0] ?? null;
}

export function isMemberOf(u: ServerUser, p: ProjectRow): boolean {
  return (p.assignedUsers ?? []).includes(u.id);
}

// rules: canReadProject = admin | member | investor (investor wajib assigned)
export function canReadProject(u: ServerUser, p: ProjectRow): boolean {
  if (u.role === "admin") return true;
  return isMemberOf(u, p); // member & investor sama-sama lewat assignedUsers
}

// rules: canWriteProject (operasional) = admin | member. INVESTOR TIDAK BOLEH.
export function canWriteProject(u: ServerUser, p: ProjectRow): boolean {
  if (u.role === "investor") return false;
  return u.role === "admin" || isMemberOf(u, p);
}

// rules validLink: hanya http/https absolut (atau kosong/null)
export function validLink(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
