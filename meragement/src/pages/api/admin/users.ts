// src/pages/api/admin/users.ts — Admin-only: list user + update role/status.
// Pergantian Firestore rules "users write = isAdmin" dengan pengecekan role
// SERVER-SIDE via better-auth session (admin plugin).
// User dikelola di tabel `user` better-auth (bukan lagi dokumen users/{uid}).
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const prerender = false;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const u = session?.user as { role?: string; isActive?: boolean } | undefined;
  return u?.role === "admin" && u.isActive !== false;
}

function safeUser(row: typeof user.$inferSelect) {
  const { name, email, role, isActive, createdAt, updatedAt } = row;
  return { id: row.id, name, email, role, isActive, createdAt, updatedAt };
}

// GET /api/admin/users — daftar user (tanpa field sensitif)
export const GET: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json({ error: "unauthorized" }, 401);
  const rows = await db.select().from(user).orderBy(desc(user.createdAt));
  return json(rows.map(safeUser), 200);
};

// POST /api/admin/users — create user (admin bikin akun member/admin baru)
export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json({ error: "unauthorized" }, 401);
  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { name, email, password, role } = body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return json({ error: "name, email, password (min 8) wajib diisi" }, 400);
  }
  const safeRole = role === "admin" ? "admin" : role === "investor" ? "investor" : "member";
  try {
    // createUser selalu membuat member (defaultRole) — role non-member di-set
    // setelahnya via Drizzle (jalur sama dengan PATCH, satu sumber penulisan role).
    const created = await auth.api.createUser({
      body: {
        email: email.trim(),
        password,
        name: name.trim(),
      },
    });
    const newId = created.user.id;
    if (safeRole !== "member") {
      await db.update(user).set({ role: safeRole }).where(eq(user.id, newId));
    }
    return json({ id: newId, email: created.user.email, role: safeRole }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create failed";
    const isDuplicate = /exist|duplicate|unique/i.test(msg);
    return json({ error: isDuplicate ? "email sudah terdaftar" : msg }, isDuplicate ? 409 : 500);
  }
};

// PATCH /api/admin/users — update role / isActive / reset password milik user lain.
// role & isActive: TIDAK BOLEH self-mutasi (cegah admin demote/diaktifkan diri sendiri
// secara tidak sengaja; minimal tetap ada 1 admin aktif).
export const PATCH: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const me = session?.user as
    | { id: string; role?: string; isActive?: boolean }
    | undefined;
  if (me?.role !== "admin" || me.isActive === false) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { id?: string; role?: string; isActive?: boolean; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { id, role, isActive, password } = body;
  if (!id) return json({ error: "id wajib" }, 400);
  if (id === me.id && (role !== undefined || isActive !== undefined)) {
    return json({ error: "tidak boleh mengubah role/status diri sendiri" }, 400);
  }
  if (role !== undefined && role !== "admin" && role !== "member" && role !== "investor") {
    return json({ error: "role harus admin|member|investor" }, 400);
  }
  if (password !== undefined && password.length < 8) {
    return json({ error: "password min 8 karakter" }, 400);
  }

  try {
    if (role !== undefined) {
      await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, id));
    }
    if (isActive !== undefined) {
      await db.update(user).set({ isActive, updatedAt: new Date() }).where(eq(user.id, id));
    }
    if (password !== undefined) {
      // Tulis hash bcrypt langsung ke account credential (kebijakan password
      // tetap milik admin; user signin pakai password baru ini).
      await db.execute(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (await import("drizzle-orm")).sql`UPDATE account SET password = ${bcrypt.hashSync(password, 10)} WHERE user_id = ${id} AND provider_id = 'credential'`,
      );
      await db.update(user).set({ updatedAt: new Date() }).where(eq(user.id, id));
    }
    const fresh = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!fresh.length) return json({ error: "user tidak ditemukan" }, 404);
    return json(safeUser(fresh[0]), 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "update failed";
    return json({ error: msg }, 500);
  }
};

// DELETE /api/admin/users?id=... — hapus user (admin tidak boleh hapus diri sendiri)
export const DELETE: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const me = session?.user as { id: string; role?: string } | undefined;
  if (me?.role !== "admin") return json({ error: "unauthorized" }, 401);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id wajib" }, 400);
  if (id === me.id) return json({ error: "tidak boleh menghapus diri sendiri" }, 400);

  const res = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id });
  if (!res.length) return json({ error: "user tidak ditemukan" }, 404);
  return json({ ok: true }, 200);
};
