// src/pages/api/projects.ts — List + create projects.
// rules: create = admin; read = admin | member(assigned_users).
// Scope: GET /api/projects?scope=mine (default) | all (admin saja).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { projects, teams } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireUser, isAdmin, json, isUuid } from "@/lib/server-auth";
import type { ProjectRow } from "@/lib/server-auth";

export const prerender = false;

function shape(p: ProjectRow) {
  return {
    id: p.id,
    title: p.title,
    shortCall: p.shortCall ?? "",
    description: p.description ?? "",
    status: p.status,
    priority: p.priority,
    teamId: p.teamId,
    assignedUsers: p.assignedUsers ?? [],
    createdBy: p.createdBy,
    startDate: p.startDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const GET: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
  if (scope === "all") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403);
    const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
    return json(rows.map(shape), 200);
  }
  const rows = await db
    .select()
    .from(projects)
    .where(sql`${me.id} = ANY(${projects.assignedUsers})`)
    .orderBy(desc(projects.updatedAt));
  return json(rows.map(shape), 200);
};

export const POST: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!isAdmin(me)) return json({ error: "unauthorized" }, 401);
  let body: {
    title?: string;
    shortCall?: string;
    description?: string;
    status?: string;
    priority?: string;
    teamId?: string;
    assignedUsers?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.title?.trim()) return json({ error: "title wajib diisi" }, 400);
  const assignedUsers = Array.isArray(body.assignedUsers)
    ? (body.assignedUsers as unknown[]).filter((u): u is string => typeof u === "string" && u !== "")
    : [];
  let teamId: string | null = null;
  if (body.teamId) {
    if (!isUuid(body.teamId)) return json({ error: "teamId tidak valid" }, 400);
    const t = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, body.teamId)).limit(1);
    if (!t.length) return json({ error: "team tidak ditemukan" }, 404);
    teamId = body.teamId;
  }
  const inserted = await db
    .insert(projects)
    .values({
      title: body.title.trim(),
      shortCall: body.shortCall?.trim() ?? "",
      description: body.description?.trim() ?? "",
      status: body.status?.trim() || "active",
      priority: body.priority?.trim() || "medium",
      teamId,
      assignedUsers,
      createdBy: me!.id,
    })
    .returning();
  return json(shape(inserted[0]), 201);
};
