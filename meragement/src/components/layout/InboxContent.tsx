import { useEffect, useState, type JSX } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";
import type { InboxEmail } from "@/lib/types";

export default function InboxContent(): JSX.Element {
    const [emails, setEmails] = useState<InboxEmail[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Session terkirim otomatis via cookie better-auth — tanpa Bearer token.
                const res = await fetch("/api/inbox");
                if (cancelled) return;
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
                if (cancelled) return;
                if (Array.isArray(data)) {
                    setEmails(data);
                } else {
                    console.error("Inbox error:", data.error);
                    setError("Gagal memuat inbox.");
                    setEmails([]);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    setError("Gagal memuat inbox.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4 md:p-6">
            {loading && <div className="col-span-full"><CardSkeleton rows={3} /></div>}
            {!loading && error && (
                <div className="col-span-full">
                    <EmptyState title={error} hint="Periksa konfigurasi inbox di server atau login ulang." />
                </div>
            )}
            {!loading && !error && emails.length === 0 && (
                <div className="col-span-full">
                    <EmptyState title="Inbox kosong" hint="Tidak ada email belum dibaca." />
                </div>
            )}
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
