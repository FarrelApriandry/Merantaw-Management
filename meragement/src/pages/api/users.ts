// src/pages/api/users.ts — Direktori user (pengganti koleksi users_public).
// GET: user login mana pun boleh baca (nama/role untuk dropdown assignee).
// Field sensitif tidak diekspos. Kelola penuh tetap di /api/admin/users.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { requireUser, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .orderBy(asc(user.name));
  return json(rows, 200);
};
