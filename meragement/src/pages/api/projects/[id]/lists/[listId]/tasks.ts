// src/pages/api/projects/[id]/lists/[listId]/tasks.ts — Tasks: GET + POST + batch DELETE.
// rules: read = admin|member; create = admin|member (validLink); delete batch = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { lists, tasks } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  requireUser,
  canReadProject,
  canWriteProject,
  getProjectRow,
  validLink,
  json,
  isUuid,
} from "@/lib/server-auth";

export const prerender = false;

async function getList(projectId: string, listId: string) {
  if (!isUuid(listId)) return null;
  const rows = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.projectId, projectId)))
    .limit(1);
  return rows[0] ?? null;
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v !== "") return [v];
  return [];
}

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const l = await getList(p.id, params.listId ?? "");
  if (!l) return json({ error: "list tidak ditemukan" }, 404);
  const rows = await db.select().from(tasks).where(eq(tasks.listId, l.id));
  return json(rows, 200);
};

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const l = await getList(p.id, params.listId ?? "");
  if (!l) return json({ error: "list tidak ditemukan" }, 404);
  let body: { title?: string; status?: string; category?: unknown; assignedTo?: unknown; dueDate?: string; link?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.title?.trim()) return json({ error: "title wajib diisi" }, 400);
  if (!validLink(body.link)) return json({ error: "link harus http(s)://..." }, 400);
  const inserted = await db
    .insert(tasks)
    .values({
      projectId: p.id,
      listId: l.id,
      title: body.title.trim(),
      status: body.status?.trim() || "draft",
      category: strArr(body.category),
      assignedTo: strArr(body.assignedTo),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      link: body.link?.trim() ?? "",
    })
    .returning();
  return json(inserted[0], 201);
};

// DELETE ?ids=a,b,c — batch delete dalam satu list
export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canWriteProject(me, p)) return json({ error: "forbidden" }, 403);
  const l = await getList(p.id, params.listId ?? "");
  if (!l) return json({ error: "list tidak ditemukan" }, 404);
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isUuid);
  if (!ids.length) return json({ error: "ids wajib (uuid, koma-separated)" }, 400);
  await db.delete(tasks).where(and(eq(tasks.listId, l.id), inArray(tasks.id, ids)));
  return json({ ok: true, deleted: ids.length }, 200);
};
