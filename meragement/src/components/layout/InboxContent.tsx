import { useEffect, useState, type JSX } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebaseConfig";
import type { InboxEmail } from "@/lib/types";

export default function InboxContent(): JSX.Element {
    const [emails, setEmails] = useState<InboxEmail[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // P0: kirim Firebase ID token — /api/inbox wajib Bearer auth
                const idToken = await auth.currentUser?.getIdToken().catch(() => null);
                const res = await fetch("/api/inbox", {
                    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
                });
                if (res.status === 401) {
                    setError("Unauthorized — silakan login ulang.");
                    setEmails([]);
                    return;
                }
                if (res.status === 503) {
                    setError("Inbox belum dikonfigurasi (server env kosong).");
                    setEmails([]);
                    return;
                }
                const data = (await res.json()) as InboxEmail[] | { error?: string };
                if (Array.isArray(data)) {
                    setEmails(data);
                } else {
                    console.error("Inbox error:", data.error);
                    setError("Gagal memuat inbox.");
                    setEmails([]);
                }
            } catch (err) {
                console.error(err);
                setError("Gagal memuat inbox.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="gap-4 grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 p-6">
            {loading && <div className="text-white/80">Loading emails...</div>}
            {!loading && error && <div className="text-red-300 text-sm">{error}</div>}
            {emails.map((email, idx) => (
                <motion.div key={idx} whileHover={{ scale: 1.02 }}>
                <Card className="gap-2 bg-white/5 border border-white/10 text-white">
                    <CardHeader>
                    <CardTitle className="text-sm">{email.subject || "(No Subject)"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/80">
                    <div><strong>From:</strong> {email.from}</div>
                    <div><strong>Date:</strong> {email.date}</div>
                    </CardContent>
                </Card>
                </motion.div>
            ))}
        </div>
    );
}
