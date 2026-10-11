// src/pages/api/projects/[id]/members.ts — Anggota project (assignedUsers)
// beserta nama/email — untuk dropdown assignee. rules: read = admin|member.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { requireUser, canReadProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);
  const ids = p.assignedUsers ?? [];
  if (!ids.length) return json([], 200);
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.id, ids));
  return json(rows, 200);
};
