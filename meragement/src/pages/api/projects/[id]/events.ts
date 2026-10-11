// src/pages/api/projects/[id]/events.ts — Calendar events: GET + POST.
// rules: read = admin|member; write = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireUser, canReadProject, canWriteProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const rows = await db.select().from(events).where(eq(events.projectId, p.id)).orderBy(asc(events.start));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  let body: { title?: string; start?: string; end?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.title?.trim() || !body.start) {
    return json({ error: "title & start wajib diisi" }, 400);
  }
  const inserted = await db
    .insert(events)
    .values({
      projectId: p.id,
      title: body.title.trim(),
      start: new Date(body.start),
      end: body.end ? new Date(body.end) : null,
      color: body.color ?? "#8b5cf6",
    })
    .returning();
  return json(inserted[0], 201);
};
