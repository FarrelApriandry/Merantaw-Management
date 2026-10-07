// src/pages/api/inbox.ts — P2: verifikasi Firebase ID token (firebase-admin) + legacy token.
// - Terima Bearer <Firebase ID token> yang valid (verifyIdToken) ATAU legacy INBOX_API_TOKEN.
// - Secret HANYA dari server env (tanpa prefix PUBLIC_).
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

type AdminAuthLike = { verifyIdToken: (token: string) => Promise<unknown> };

let adminAuthPromise: Promise<AdminAuthLike | null> | null = null;

async function getAdminAuth(): Promise<AdminAuthLike | null> {
  if (adminAuthPromise) return adminAuthPromise;
  adminAuthPromise = (async () => {
    try {
      const appMod = await import("firebase-admin/app");
      const authMod = await import("firebase-admin/auth");
      const apps = appMod.getApps();
      if (apps.length === 0) {
        // Prefer explicit service-account JSON bila tersedia (Vercel env),
        // fallback ke applicationDefault() (GOOGLE_APPLICATION_CREDENTIALS).
        const raw =
          (typeof process !== "undefined" && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
          undefined;
        if (raw) {
          const cred = JSON.parse(raw) as Parameters<typeof appMod.cert>[0];
          appMod.initializeApp({ credential: appMod.cert(cred) });
        } else {
          appMod.initializeApp();
        }
      }
      return authMod.getAuth() as unknown as AdminAuthLike;
    } catch {
      return null;
    }
  })();
  return adminAuthPromise;
}

function getServerEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env[name]) return process.env[name];
  const v = (import.meta.env as Record<string, unknown>)[name];
  return typeof v === "string" && v ? v : undefined;
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

async function assertAuthorized(req: Request): Promise<boolean> {
  const token = getBearerToken(req);
  if (!token) return false;
  // P2: legacy service token — samakan dengan INBOX_API_TOKEN server-side.
  const expected =
    (typeof process !== "undefined" && process.env.INBOX_API_TOKEN) ||
    (import.meta.env.INBOX_API_TOKEN as string | undefined);
  if (expected && token === expected) return true;
  // P2: Firebase ID token dari client (auth.currentUser.getIdToken()).
  try {
    const adminAuth = await getAdminAuth();
    if (!adminAuth) return false;
    await adminAuth.verifyIdToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function GET({ request }: { request: Request }): Promise<Response> {
  if (!(await assertAuthorized(request))) {
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

