// src/pages/api/projects/[id]/discussions/[discId]/replies.ts —
// Replies: GET + POST (isSolution=false server-side, replyCount+1 atomik).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions, replies } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { requireUser, canReadProject, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

async function scopedDisc(projectId: string, discId: string) {
  if (!isUuid(discId)) return null;
  const rows = await db
    .select()
    .from(discussions)
    .where(and(eq(discussions.id, discId), eq(discussions.projectId, projectId)))
    .limit(1);
  return rows[0] ?? null;
}

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const d = await scopedDisc(p.id, params.discId ?? "");
  if (!d) return json({ error: "discussion tidak ditemukan" }, 404);
  const rows = await db
    .select()
    .from(replies)
    .where(eq(replies.discussionId, d.id))
    .orderBy(asc(replies.createdAt));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const d = await scopedDisc(p.id, params.discId ?? "");
  if (!d) return json({ error: "discussion tidak ditemukan" }, 404);
  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.content?.trim()) return json({ error: "content wajib diisi" }, 400);
  const inserted = await db
    .insert(replies)
    .values({
      discussionId: d.id,
      content: body.content.trim(),
      authorId: me.id,
      authorName: me.name || me.email,
      isSolution: false,
    })
    .returning();
  await db.execute(
    sql`UPDATE discussions SET reply_count = reply_count + 1, updated_at = now() WHERE id = ${d.id}`,
  );
  return json(inserted[0], 201);
};
