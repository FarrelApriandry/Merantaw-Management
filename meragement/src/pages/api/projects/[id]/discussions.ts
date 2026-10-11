// src/pages/api/projects/[id]/discussions.ts — Discussions: GET + POST.
// rules: read = admin|member; create = admin|member (status open, solutionId null,
// replyCount 0 — di-set server, bukan dari client).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser, canReadProject, canWriteProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const rows = await db
    .select()
    .from(discussions)
    .where(eq(discussions.projectId, p.id))
    .orderBy(desc(discussions.createdAt));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.title?.trim() || !body.content?.trim()) {
    return json({ error: "title & content wajib diisi" }, 400);
  }
  const inserted = await db
    .insert(discussions)
    .values({
      projectId: p.id,
      title: body.title.trim(),
      content: body.content.trim(),
      authorId: me.id,
      authorName: me.name || me.email,
      status: "open",
      solutionId: null,
      replyCount: 0,
    })
    .returning();
  return json(inserted[0], 201);
};
