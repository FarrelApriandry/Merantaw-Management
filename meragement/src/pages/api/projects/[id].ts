// src/pages/api/projects/[id].ts — Get / update / delete satu project.
// rules: read = admin|member; update operasional = admin|member (assignedUsers,
// teamId, createdBy, createdAt hanya admin); delete = admin.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { projects, teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  canReadProject,
  canWriteProject,
  getProjectRow,
  json,
} from "@/lib/server-auth";

export const prerender = false;

const MEMBER_LOCKED = ["assignedUsers", "teamId", "createdBy", "createdAt"];

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  return json(p, 200);
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (me.role !== "admin") {
    const touched = MEMBER_LOCKED.filter((k) => body[k] !== undefined);
    if (touched.length) return json({ error: `forbidden: ${touched.join(", ")} hanya admin` }, 403);
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["title", "shortCall", "description", "status", "priority"] as const) {
    if (typeof body[k] === "string") set[k] = (body[k] as string).trim();
  }
  if (me.role === "admin") {
    if (body.assignedUsers !== undefined) {
      if (!Array.isArray(body.assignedUsers)) return json({ error: "assignedUsers harus array" }, 400);
      set.assignedUsers = (body.assignedUsers as unknown[]).filter(
        (u): u is string => typeof u === "string" && u !== "",
      );
    }
    if (body.teamId !== undefined) {
      if (body.teamId !== null && typeof body.teamId !== "string") {
        return json({ error: "teamId tidak valid" }, 400);
      }
      if (typeof body.teamId === "string" && body.teamId !== "") {
        const t = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, body.teamId)).limit(1);
        if (!t.length) return json({ error: "team tidak ditemukan" }, 404);
        set.teamId = body.teamId;
      } else {
        set.teamId = null;
      }
    }
  }
  const updated = await db
    .update(projects)
    .set(set)
    .where(eq(projects.id, p.id))
    .returning();
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (me.role !== "admin") return json({ error: "forbidden" }, 403);
  // Cascade ke lists/tasks/docs/discussions/replies/events via FK onDelete cascade.
  await db.delete(projects).where(eq(projects.id, p.id));
  return json({ ok: true }, 200);
};
