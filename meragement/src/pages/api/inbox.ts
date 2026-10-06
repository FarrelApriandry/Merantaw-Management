// src/pages/api/inbox.ts — Gmail IMAP inbox (Astro server endpoint)
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

export async function GET(): Promise<Response> {
  try {
        const config = {
        imap: {
            user: import.meta.env.PUBLIC_SMTP_USER as string,
            password: import.meta.env.PUBLIC_VITE_GMAIL_APP_PASSWORD as string,
            host: "imap.gmail.com",
            port: 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false },
        },
        };

        const connection = await Imap.connect(config);
        await connection.openBox("INBOX");

        // Ambil semua email (atau bisa ubah jadi ["ALL"] kalau mau semua)
        const searchCriteria = ["ALL"];
        const fetchOptions = {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
        struct: true,
        };
        const messages = (await connection.search(searchCriteria, fetchOptions)) as unknown as ImapMessage[];

        // Ambil header-nya aja
        const emails: InboxEmail[] = messages
        .map((item) => {
            const header = (item.parts.find(
            (part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)"
            )?.body ?? {}) as ImapHeader;
            return {
            from: header.from?.[0] || "(unknown)",
            subject: header.subject?.[0] || "(No Subject)",
            date: new Date(header.date?.[0] || "").getTime() || 0,
            };
        })
        .sort((a, b) => (b.date as number) - (a.date as number))
        .slice(0, 15)
        .map((email) => ({
            ...email,
            date: new Date(email.date as number).toLocaleString(),
        }));

        connection.end();

        return new Response(JSON.stringify(emails), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
        });
    }
}
