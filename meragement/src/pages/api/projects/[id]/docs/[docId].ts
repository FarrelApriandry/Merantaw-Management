// src/pages/api/projects/[id]/docs/[docId].ts — PATCH + DELETE satu doc.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { docs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  if (!isUuid(params.docId)) return json({ error: "docId tidak valid" }, 400);
  let body: { title?: string; content?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const set: Record<string, unknown> = { updatedAt: new Date(), updatedBy: me.id };
  if (body.title !== undefined) {
    if (!body.title.trim()) return json({ error: "title tidak boleh kosong" }, 400);
    set.title = body.title.trim();
  }
  if (body.content !== undefined) set.content = body.content;
  if (body.category !== undefined) set.category = body.category.trim() || "Other";
  const updated = await db
    .update(docs)
    .set(set)
    .where(and(eq(docs.id, params.docId as string), eq(docs.projectId, p.id)))
    .returning();
  if (!updated.length) return json({ error: "doc tidak ditemukan" }, 404);
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  if (!isUuid(params.docId)) return json({ error: "docId tidak valid" }, 400);
  const res = await db
    .delete(docs)
    .where(and(eq(docs.id, params.docId as string), eq(docs.projectId, p.id)))
    .returning({ id: docs.id });
  if (!res.length) return json({ error: "doc tidak ditemukan" }, 404);
  return json({ ok: true }, 200);
};
