// src/pages/api/projects/[id]/stream.ts — SSE (Server-Sent Events) pengganti onSnapshot.
//
// Cara kerja: satu request memegang koneksi terbuka sampai 285 detik (< maxDuration 300s
// di Vercel Hobby, supaya ditutup rapi, bukan diputus 504). Tiap 2.5s server cek satu
// query watermark agregat (max updated_at seluruh konten project). Kalau watermark
// bergerak → kirim `event: change`, client lalu refetch view-nya. Kalau tidak →
// heartbeat `: ping` tiap 15s supaya Cloudflare/nginx tidak memutus koneksi.
//
// Kenapa watermark, bukan kirim data? Payload tetap kecil dan satu jalur notifikasi
// melayani semua view (tasks/docs/discussions/events/dashboard) tanpa tabel baru.
// Tanpa SSE setiap view polling 10-15 detik; sekarang refresh <2.5 detik setelah write.
//
// Catatan tenant (keputusan user, 2026-10-20): tabel `events` TIDAK punya `updated_at`,
// jadi events memakai `created_at`. Akibatnya drag-and-drop/resize event di Kalender
// hanya terbawa SSE saat event baru dibuat; perubahan setelah itu menunggu poll
// 10 detik di CalendarPage. Menambahkan kolom updated_at ke events menutup celah ini.
//
// rules: read = admin|member|investor(assigned) — sama dengan semua view turunannya.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { discussions, docs, events, lists, projects, replies, tasks } from "@/lib/db/schema";
import { eq, max, sql } from "drizzle-orm";
import { requireUser, canReadProject, getProjectRow, json } from "@/lib/server-auth";

export const prerender = false;

// Interval cek DB. Semakin kecil semakin responsif, masing-masing tiap = 1 query.
const TICK_MS = 2500;
// Heartbeat lebih jarang dari tick: cukup menjaga koneksi hidup tanpa menambah query.
const PING_MS = 15000;
// Batas panjang stream: 285s < maxDuration 300s. Setelah itu tutup rapi, EventSource
// auto-reconnect dan baseline dihitung ulang (tidak ada perubahan yang terlewat).
const STREAM_LIFETIME_MS = 285_000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Watermark = string | null;

/**
 * Watermark = max timestamp perubahan seluruh konten project.
 * `null` berarti project masih kosong (belum ada baris sama sekali).
 */
async function watermark(projectId: string): Promise<Watermark> {
  // tasks & docs memakai updated_at; events & replies tidak punya kolom itu
  // (replies mengikuti created_at discussion lewat subquery, events memakai created_at).
  const [taskRows, docRows, discRows, projRows, eventRows] = await Promise.all([
    db.select({ v: max(tasks.updatedAt) }).from(tasks).where(eq(tasks.projectId, projectId)),
    db.select({ v: max(docs.updatedAt) }).from(docs).where(eq(docs.projectId, projectId)),
    db
      .select({ v: max(discussions.updatedAt) })
      .from(discussions)
      .where(eq(discussions.projectId, projectId)),
    db.select({ v: max(projects.updatedAt) }).from(projects).where(eq(projects.id, projectId)),
    db.select({ v: max(events.createdAt) }).from(events).where(eq(events.projectId, projectId)),
  ]);

  // replies: join ke discussions milik project (replies tidak punya project_id).
  const replyRows = await db
    .select({ v: max(replies.createdAt) })
    .from(replies)
    .where(sql`${replies.discussionId} IN (SELECT id FROM ${discussions} WHERE project_id = ${projectId})`);

  let best: Date | null = null;
  for (const rows of [taskRows, docRows, discRows, projRows, eventRows, replyRows]) {
    const v = rows[0]?.v ?? null;
    if (v && (!best || v.getTime() > best.getTime())) best = v;
  }
  return best ? best.toISOString() : null;
}

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);
  const p = await getProjectRow(params.id ?? "");
  if (!p) return json({ error: "project tidak ditemukan" }, 404);
  if (!canReadProject(me, p)) return json({ error: "forbidden" }, 403);

  const encoder = new TextEncoder();
  let last: Watermark | undefined;
  let lastPing = 0;
  let closed = false;

  // Dipanggil saat client menutup EventSource (ganti tab, logout, pindah halaman).
  request.signal.addEventListener("abort", () => { closed = true; }, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true; // stream sudah tertutup — hentikan loop
        }
      };

      try {
        // `retry` memberitahu EventSource jeda reconnect kalau koneksi putus.
        send("retry: 3000\n");
        // Baseline awal supaya client tahu dari state mana perubahan dihitung.
        last = await watermark(p.id);
        send(`event: init\ndata: ${JSON.stringify({ watermark: last })}\n\n`);

        const deadline = Date.now() + STREAM_LIFETIME_MS;
        while (!closed && Date.now() < deadline) {
          await sleep(TICK_MS);
          if (closed) break;
          let now: Watermark;
          try {
            now = await watermark(p.id);
          } catch {
            continue; // DB sesaat gagal — coba lagi tick berikutnya, jangan putus stream
          }
          if (now !== last) {
            last = now;
            send(`event: change\ndata: ${JSON.stringify({ watermark: now })}\n\n`);
          } else if (Date.now() - lastPing >= PING_MS) {
            lastPing = Date.now();
            send(`: ping\n\n`);
          }
        }
      } catch {
        // abaikan — penutupan apa pun tetap lewat finally
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* sudah tertutup */
          }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      // `no-transform` mencegah kompresi; buffering di Cloudflare dimatikan lewat
      // X-Accel-Buffering, kalau tidak data tertahan sampai batch penuh.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
