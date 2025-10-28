import Imap from "imap-simple";

export async function GET() {
  try {
        const config = {
        imap: {
            user: "merantawid@gmail.com",
            password: import.meta.env.PUBLIC_VITE_GMAIL_APP_PASSWORD,
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
        const messages = await connection.search(searchCriteria, fetchOptions);

        // Ambil header-nya aja
        const emails = messages
        .map((item) => {
            const header = item.parts.find(
            (part) => part.which === "HEADER.FIELDS (FROM TO SUBJECT DATE)"
            ).body;
            return {
            from: header.from?.[0] || "(unknown)",
            subject: header.subject?.[0] || "(No Subject)",
            date: new Date(header.date?.[0] || "").getTime() || 0,
            };
        })
        // urutkan dari terbaru → terlama
        .sort((a, b) => b.date - a.date)
        // ambil cuma 50 teratas
        .slice(0, 15)
        // ubah date-nya biar readable lagi
        .map((email) => ({
            ...email,
            date: new Date(email.date).toLocaleString(),
        }));

        connection.end();

        return new Response(JSON.stringify(emails), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
        });
    }
}
