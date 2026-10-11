// src/pages/api/projects/[id]/overview.ts — Satu panggilan untuk space dashboard:
// project + lists (dengan task count) + statistik + docs & diskusi terbaru.
// rules: read = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions, docs, lists, tasks } from "@/lib/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
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
  const byList = new Map<string, number>();
  for (const t of ts) byList.set(t.listId, (byList.get(t.listId) ?? 0) + 1);
  const done = ts.filter((t) => t.status === "done").length;

  const ds = await db
    .select({ id: docs.id, title: docs.title, category: docs.category, updatedAt: docs.updatedAt })
    .from(docs)
    .where(eq(docs.projectId, p.id))
    .orderBy(desc(docs.updatedAt))
    .limit(5);
  const dsAll = await db.select({ category: docs.category }).from(docs).where(eq(docs.projectId, p.id));

  const discs = await db
    .select({
      id: discussions.id,
      title: discussions.title,
      status: discussions.status,
      replyCount: discussions.replyCount,
    })
    .from(discussions)
    .where(eq(discussions.projectId, p.id))
    .orderBy(desc(discussions.createdAt))
    .limit(5);
  const discsAll = await db
    .select({ status: discussions.status })
    .from(discussions)
    .where(eq(discussions.projectId, p.id));

  return json(
    {
      project: p,
      lists: ls.map((l) => ({ ...l, taskCount: byList.get(l.id) ?? 0 })),
      taskStats: {
        total: ts.length,
        done,
        rate: ts.length ? Math.round((done / ts.length) * 100) : 0,
      },
      docStats: {
        total: dsAll.length,
        gdd: dsAll.filter((d) => d.category === "GDD").length,
        srs: dsAll.filter((d) => d.category === "SRS").length,
        wiki: dsAll.filter((d) => d.category === "Wiki").length,
      },
      discStats: {
        total: discsAll.length,
        solved: discsAll.filter((d) => d.status === "solved").length,
      },
      recentDocs: ds,
      recentDiscussions: discs,
    },
    200,
  );
};
