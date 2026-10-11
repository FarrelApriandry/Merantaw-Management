// src/pages/api/projects/[id]/discussions/[discId]/replies/[replyId].ts —
// PATCH (isSolution hanya author/admin) + DELETE (admin|member) +
// POST /solution (author menandai solusi: reset prev, set baru, status solved).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions, replies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

async function scoped(projectId: string, discId: string, replyId?: string) {
  if (!isUuid(discId) || (replyId && !isUuid(replyId))) return null;
  const dRows = await db
    .select()
    .from(discussions)
    .where(and(eq(discussions.id, discId), eq(discussions.projectId, projectId)))
    .limit(1);
  if (!dRows.length) return null;
  if (!replyId) return { d: dRows[0], r: null };
  const rRows = await db
    .select()
    .from(replies)
    .where(and(eq(replies.id, replyId), eq(replies.discussionId, discId)))
    .limit(1);
  if (!rRows.length) return null;
  return { d: dRows[0], r: rRows[0] };
}

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const s = await scoped(p.id, params.discId ?? "", params.replyId ?? "");
  if (!s?.r) return json({ error: "reply tidak ditemukan" }, 404);
  let body: { content?: string; isSolution?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const isAuthor = s.d.authorId === me.id;
  if (body.isSolution !== undefined && me.role !== "admin" && !isAuthor) {
    return json({ error: "forbidden: isSolution hanya author/admin" }, 403);
  }
  const set: Record<string, unknown> = {};
  if (body.content !== undefined) {
    if (!body.content.trim()) return json({ error: "content tidak boleh kosong" }, 400);
    set.content = body.content.trim();
  }
  if (body.isSolution !== undefined && (me.role === "admin" || isAuthor)) {
    set.isSolution = !!body.isSolution;
  }
  const updated = await db.update(replies).set(set).where(eq(replies.id, s.r.id)).returning();
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const s = await scoped(p.id, params.discId ?? "", params.replyId ?? "");
  if (!s?.r) return json({ error: "reply tidak ditemukan" }, 404);
  if (s.r.isSolution) {
    await db
      .update(discussions)
      .set({ solutionId: null, status: "open", updatedAt: new Date() })
      .where(eq(discussions.id, s.d.id));
  }
  await db.delete(replies).where(eq(replies.id, s.r.id));
  return json({ ok: true }, 200);
};

// POST .../replies/[replyId]/solution — tandai solusi (author/admin discussion)
export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const s = await scoped(p.id, params.discId ?? "", params.replyId ?? "");
  if (!s?.r) return json({ error: "reply tidak ditemukan" }, 404);
  if (me.role !== "admin" && s.d.authorId !== me.id) {
    return json({ error: "hanya author diskusi yang boleh menandai solusi" }, 403);
  }
  if (s.d.solutionId && s.d.solutionId !== s.r.id) {
    await db.update(replies).set({ isSolution: false }).where(eq(replies.id, s.d.solutionId));
  }
  await db.update(replies).set({ isSolution: true }).where(eq(replies.id, s.r.id));
  await db
    .update(discussions)
    .set({ status: "solved", solutionId: s.r.id, updatedAt: new Date() })
    .where(eq(discussions.id, s.d.id));
  return json({ ok: true }, 200);
};
