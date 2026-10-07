// src/pages/api/inbox.ts — P0 hardened Gmail IMAP inbox (Astro server endpoint)
// - Secret HANYA dari server env (tanpa prefix PUBLIC_)
// - Wajib Authorization: Bearer <INBOX_API_TOKEN>
// - TLS verify ON, batasi search, pastikan connection.end()
import Imap from "imap-simple";
import type { InboxEmail } from "@/lib/types";

interface ImapHeader {
  from?: string[];
  subject?: string[];
  date?: string[];
}

interface ImapPart {
  which: string;
  body: ImapHeader & Record<string, unknown>;
}

interface ImapMessage {
  parts: ImapPart[];
}

const HEADER_KEY = "HEADER.FIELDS (FROM TO SUBJECT DATE)";
const MAX_RESULTS = 15;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function assertAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return false;
  // P0: token statis server-side. Set INBOX_API_TOKEN di Vercel env (tanpa PUBLIC_).
  // Client wajib kirim Firebase ID token? Untuk sekarang samakan dengan INBOX_API_TOKEN
  // yang didapat setelah login via endpoint terpisah — jangan expose via PUBLIC_.
  // TODO P2: verifikasi Firebase ID token via firebase-admin verifyIdToken().
  const expected =
    (typeof process !== "undefined" && process.env.INBOX_API_TOKEN) ||
    (import.meta.env.INBOX_API_TOKEN as string | undefined);
  if (!expected) return false;
  return token === expected;
}

function getServerEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env[name]) return process.env[name];
  const v = (import.meta.env as Record<string, unknown>)[name];
  return typeof v === "string" && v ? v : undefined;
}

export async function GET({ request }: { request: Request }): Promise<Response> {
  if (!assertAuthorized(request)) {
    return json({ error: "unauthorized" }, 401);
  }

  // Server-only secrets — JANGAN pakai import.meta.env.PUBLIC_*
  const user = getServerEnv("GMAIL_IMAP_USER");
  const password = getServerEnv("GMAIL_IMAP_APP_PASSWORD");
  if (!user || !password) {
    return json({ error: "inbox not configured" }, 503);
  }

  let connection: Awaited<ReturnType<typeof Imap.connect>> | null = null;
  try {
    connection = await Imap.connect({
      imap: {
        user,
        password,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: true },
      },
    });
    await connection.openBox("INBOX");

    // Batasi: hanya UNSEEN terbaru, bukan ALL (hemat kuota + privasi)
    const searchCriteria = ["UNSEEN"];
    const fetchOptions = { bodies: [HEADER_KEY], struct: true };
    const messages = (await connection.search(searchCriteria, fetchOptions)) as unknown as ImapMessage[];

    const emails: InboxEmail[] = messages
      .map((item) => {
        const header = (item.parts.find((part) => part.which === HEADER_KEY)?.body ?? {}) as ImapHeader;
        return {
          from: header.from?.[0] || "(unknown)",
          subject: header.subject?.[0] || "(No Subject)",
          date: new Date(header.date?.[0] || "").getTime() || 0,
        };
      })
      .sort((a, b) => (b.date as number) - (a.date as number))
      .slice(0, MAX_RESULTS)
      .map((email) => ({
        ...email,
        date: new Date(email.date as number).toLocaleString(),
      }));

    return json(emails, 200);
  } catch {
    return json({ error: "failed to fetch inbox" }, 500);
  } finally {
    try {
      connection?.end();
    } catch {
      /* ignore */
    }
  }
}

