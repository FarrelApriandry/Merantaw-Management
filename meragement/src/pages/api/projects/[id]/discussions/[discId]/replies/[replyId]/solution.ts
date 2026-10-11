// src/pages/api/projects/[id]/discussions/[discId]/replies/[replyId]/solution.ts —
// Alias POST mark-as-solution (dipakai UI via POST ke path ini).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions, replies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const { discId = "", replyId = "" } = params;
  if (!isUuid(discId) || !isUuid(replyId)) return json({ error: "id tidak valid" }, 400);
  const dRows = await db
    .select()
    .from(discussions)
    .where(and(eq(discussions.id, discId), eq(discussions.projectId, p.id)))
    .limit(1);
  if (!dRows.length) return json({ error: "discussion tidak ditemukan" }, 404);
  const d = dRows[0];
  const rRows = await db
    .select()
    .from(replies)
    .where(and(eq(replies.id, replyId), eq(replies.discussionId, discId)))
    .limit(1);
  if (!rRows.length) return json({ error: "reply tidak ditemukan" }, 404);
  if (me.role !== "admin" && d.authorId !== me.id) {
    return json({ error: "hanya author diskusi yang boleh menandai solusi" }, 403);
  }
  if (d.solutionId && d.solutionId !== replyId) {
    await db.update(replies).set({ isSolution: false }).where(eq(replies.id, d.solutionId));
  }
  await db.update(replies).set({ isSolution: true }).where(eq(replies.id, replyId));
  await db
    .update(discussions)
    .set({ status: "solved", solutionId: replyId, updatedAt: new Date() })
    .where(eq(discussions.id, discId));
  return json({ ok: true }, 200);
};
