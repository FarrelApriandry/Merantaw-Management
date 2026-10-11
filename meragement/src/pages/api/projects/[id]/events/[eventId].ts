// src/pages/api/projects/[id]/events/[eventId].ts — PATCH + DELETE satu event.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  if (!isUuid(params.eventId)) return json({ error: "eventId tidak valid" }, 400);
  let body: { title?: string; start?: string; end?: string | null; color?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const set: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (!body.title.trim()) return json({ error: "title tidak boleh kosong" }, 400);
    set.title = body.title.trim();
  }
  if (body.start !== undefined) set.start = new Date(body.start);
  if (body.end !== undefined) set.end = body.end ? new Date(body.end) : null;
  if (body.color !== undefined) set.color = body.color;
  const updated = await db
    .update(events)
    .set(set)
    .where(and(eq(events.id, params.eventId as string), eq(events.projectId, p.id)))
    .returning();
  if (!updated.length) return json({ error: "event tidak ditemukan" }, 404);
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  if (!isUuid(params.eventId)) return json({ error: "eventId tidak valid" }, 400);
  const res = await db
    .delete(events)
    .where(and(eq(events.id, params.eventId as string), eq(events.projectId, p.id)))
    .returning({ id: events.id });
  if (!res.length) return json({ error: "event tidak ditemukan" }, 404);
  return json({ ok: true }, 200);
};
