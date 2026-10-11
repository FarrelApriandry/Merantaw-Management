// src/pages/api/teams.ts — CRUD teams.
// rules: read = signed-in mana pun; write = admin only.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { teams, teamMembers, user } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { requireUser, isAdmin, json, isUuid } from "@/lib/server-auth";

export const prerender = false;

interface MemberInput {
  userId?: string;
  roles?: string[];
}

function cleanMembers(input: unknown): { userId: string; roles: string[] }[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: { userId: string; roles: string[] }[] = [];
  for (const m of input as MemberInput[]) {
    const uid = typeof m?.userId === "string" ? m.userId.trim() : "";
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const roles = Array.isArray(m?.roles)
      ? m.roles.filter((r): r is string => typeof r === "string" && r.trim() !== "").map((r) => r.trim())
      : [];
    out.push({ userId: uid, roles });
  }
  return out;
}

// GET /api/teams — teams + members (beserta nama user)
export const GET: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const all = await db.select().from(teams).orderBy(asc(teams.name));
  const tm = await db.select().from(teamMembers);
  const ids = [...new Set(tm.map((m) => m.userId))];
  const users = ids.length
    ? await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(inArray(user.id, ids))
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return json(
    all.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      members: tm
        .filter((m) => m.teamId === t.id)
        .map((m) => ({
          userId: m.userId,
          roles: m.roles ?? [],
          name: byId.get(m.userId)?.name ?? "",
          email: byId.get(m.userId)?.email ?? "",
        })),
    })),
    200,
  );
};

// POST /api/teams — admin only
export const POST: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!isAdmin(me)) return json({ error: "unauthorized" }, 401);
  let body: { name?: string; description?: string; members?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.name?.trim()) return json({ error: "name wajib diisi" }, 400);
  const members = cleanMembers(body.members);
  const inserted = await db
    .insert(teams)
    .values({
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      createdBy: me!.id,
    })
    .returning();
  const team = inserted[0];
  if (members.length) {
    await db.insert(teamMembers).values(
      members.map((m) => ({ teamId: team.id, userId: m.userId, roles: m.roles })),
    );
  }
  return json({ id: team.id, name: team.name }, 201);
};

// PATCH /api/teams — admin only. members (bila dikirim) = replace penuh.
export const PATCH: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!isAdmin(me)) return json({ error: "unauthorized" }, 401);
  let body: { id?: string; name?: string; description?: string; members?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.id || !isUuid(body.id)) return json({ error: "id tidak valid" }, 400);
  const set: Partial<typeof teams.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) {
    if (!body.name.trim()) return json({ error: "name tidak boleh kosong" }, 400);
    set.name = body.name.trim();
  }
  if (body.description !== undefined) set.description = body.description.trim();
  const updated = await db.update(teams).set(set).where(eq(teams.id, body.id)).returning({ id: teams.id });
  if (!updated.length) return json({ error: "team tidak ditemukan" }, 404);
  if (body.members !== undefined) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, body.id));
    const members = cleanMembers(body.members);
    if (members.length) {
      await db.insert(teamMembers).values(
        members.map((m) => ({ teamId: body.id as string, userId: m.userId, roles: m.roles })),
      );
    }
  }
  return json({ ok: true }, 200);
};

// DELETE /api/teams?id= — admin only
export const DELETE: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!isAdmin(me)) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !isUuid(id)) return json({ error: "id tidak valid" }, 400);
  const res = await db.delete(teams).where(eq(teams.id, id)).returning({ id: teams.id });
  if (!res.length) return json({ error: "team tidak ditemukan" }, 404);
  return json({ ok: true }, 200);
};
