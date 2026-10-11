// src/pages/api/projects/[id]/tasks.ts — Agregat semua tasks lintas lists.
// Dipakai Calendar (butuh dueDate semua tasks) & Dashboard (statistik).
// rules: read = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { lists, tasks } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { requireUser, canReadProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const ls = await db.select().from(lists).where(eq(lists.projectId, p.id)).orderBy(asc(lists.order));
  const ids = ls.map((l) => l.id);
  const ts = ids.length ? await db.select().from(tasks).where(inArray(tasks.listId, ids)) : [];
  return json({ lists: ls, tasks: ts }, 200);
};
