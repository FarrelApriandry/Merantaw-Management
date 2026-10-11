// src/pages/api/projects/[id]/lists/[listId]/tasks/[taskId].ts — PATCH + DELETE satu task.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { lists, tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  requireUser,
  canWriteProject,
  getProjectRow,
  validLink,
  json,
  isUuid,
} from "@/lib/server-auth";

export const prerender = false;

async function scopedTask(projectId: string, listId: string, taskId: string) {
  if (!isUuid(listId) || !isUuid(taskId)) return null;
  const l = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.projectId, projectId)))
    .limit(1);
  if (!l.length) return null;
  const t = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.listId, listId)))
    .limit(1);
  return t[0] ?? null;
}

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const t = await scopedTask(p.id, params.listId ?? "", params.taskId ?? "");
  if (!t) return json({ error: "task tidak ditemukan" }, 404);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (body.link !== undefined && !validLink(body.link)) {
    return json({ error: "link harus http(s)://..." }, 400);
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") set.title = body.title.trim();
  if (typeof body.status === "string") set.status = body.status.trim();
  if (body.category !== undefined)
    set.category = Array.isArray(body.category)
      ? (body.category as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
  if (body.assignedTo !== undefined)
    set.assignedTo = Array.isArray(body.assignedTo)
      ? (body.assignedTo as unknown[]).filter((x): x is string => typeof x === "string")
      : typeof body.assignedTo === "string" && body.assignedTo !== ""
        ? [body.assignedTo]
        : [];
  if (body.dueDate !== undefined)
    set.dueDate = body.dueDate ? new Date(body.dueDate as string) : null;
  if (typeof body.link === "string") set.link = body.link.trim();
  const updated = await db.update(tasks).set(set).where(eq(tasks.id, t.id)).returning();
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const t = await scopedTask(p.id, params.listId ?? "", params.taskId ?? "");
  if (!t) return json({ error: "task tidak ditemukan" }, 404);
  await db.delete(tasks).where(eq(tasks.id, t.id));
  return json({ ok: true }, 200);
};
