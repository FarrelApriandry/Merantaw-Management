// src/pages/api/projects/[id]/lists.ts — Lists: GET + POST.
// rules: read = admin|member proyek; create/update = admin|member; delete = admin.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireUser, canReadProject, canWriteProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const rows = await db.select().from(lists).where(eq(lists.projectId, p.id)).orderBy(asc(lists.order));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  let body: { name?: string; icon?: string; color?: string; order?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.name?.trim()) return json({ error: "name wajib diisi" }, 400);
  const inserted = await db
    .insert(lists)
    .values({
      projectId: p.id,
      name: body.name.trim(),
      icon: body.icon ?? null,
      color: body.color ?? null,
      order: typeof body.order === "number" ? body.order : 0,
    })
    .returning();
  return json(inserted[0], 201);
};
