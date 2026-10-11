// src/pages/api/projects/[id]/lists/[listId].ts — PATCH rename + DELETE (admin only).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const listId = params.listId ?? "";
  if (!isUuid(listId)) return json({ error: "listId tidak valid" }, 400);
  let body: { name?: string; icon?: string; color?: string; order?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) {
    if (!body.name.trim()) return json({ error: "name tidak boleh kosong" }, 400);
    set.name = body.name.trim();
  }
  if (body.icon !== undefined) set.icon = body.icon;
  if (body.color !== undefined) set.color = body.color;
  if (body.order !== undefined) set.order = body.order;
  const updated = await db
    .update(lists)
    .set(set)
    .where(and(eq(lists.id, listId), eq(lists.projectId, p.id)))
    .returning();
  if (!updated.length) return json({ error: "list tidak ditemukan" }, 404);
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (me.role !== "admin") return json({ error: "forbidden" }, 403);
  const listId = params.listId ?? "";
  if (!isUuid(listId)) return json({ error: "listId tidak valid" }, 400);
  // Cascade ke tasks via FK.
  const res = await db
    .delete(lists)
    .where(and(eq(lists.id, listId), eq(lists.projectId, p.id)))
    .returning({ id: lists.id });
  if (!res.length) return json({ error: "list tidak ditemukan" }, 404);
  return json({ ok: true }, 200);
};
