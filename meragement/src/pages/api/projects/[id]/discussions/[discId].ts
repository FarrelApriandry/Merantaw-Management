// src/pages/api/projects/[id]/discussions/[discId].ts —
// PATCH (member: hanya title/content miliknya; status/solutionId = author/admin)
// + DELETE (admin only, cascade replies via FK).
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, canWriteProject, getProjectRow, json, isUuid } from "@/lib/server-auth";

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

export const PATCH: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const d = await scopedDisc(p.id, params.discId ?? "");
  if (!d) return json({ error: "discussion tidak ditemukan" }, 404);
  let body: { title?: string; content?: string; status?: string; solutionId?: string | null };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const isAuthor = d.authorId === me.id;
  if (me.role !== "admin" && !isAuthor) {
    // member non-author: hanya title/content, status/solutionId dilarang
    if (body.status !== undefined || body.solutionId !== undefined) {
      return json({ error: "forbidden: status/solution hanya author/admin" }, 403);
    }
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) {
    if (!body.title.trim()) return json({ error: "title tidak boleh kosong" }, 400);
    set.title = body.title.trim();
  }
  if (body.content !== undefined) set.content = body.content;
  if (me.role === "admin" || isAuthor) {
    if (body.status !== undefined) {
      if (body.status !== "open" && body.status !== "solved") {
        return json({ error: "status harus open|solved" }, 400);
      }
      set.status = body.status;
    }
    if (body.solutionId !== undefined) set.solutionId = body.solutionId;
  }
  const updated = await db.update(discussions).set(set).where(eq(discussions.id, d.id)).returning();
  return json(updated[0], 200);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (me.role !== "admin") return json({ error: "forbidden" }, 403);
  const d = await scopedDisc(p.id, params.discId ?? "");
  if (!d) return json({ error: "discussion tidak ditemukan" }, 404);
  await db.delete(discussions).where(eq(discussions.id, d.id));
  return json({ ok: true }, 200);
};
