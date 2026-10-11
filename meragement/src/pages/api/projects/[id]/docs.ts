// src/pages/api/projects/[id]/docs.ts — Docs: GET + POST.
// rules: read = admin|member; create/update/delete = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { docs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser, canReadProject, canWriteProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const rows = await db.select().from(docs).where(eq(docs.projectId, p.id)).orderBy(desc(docs.updatedAt));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  let body: { title?: string; content?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.title?.trim()) return json({ error: "title wajib diisi" }, 400);
  const inserted = await db
    .insert(docs)
    .values({
      projectId: p.id,
      title: body.title.trim(),
      content: body.content ?? "",
      category: body.category?.trim() || "Other",
      updatedBy: me.id,
    })
    .returning();
  return json(inserted[0], 201);
};
