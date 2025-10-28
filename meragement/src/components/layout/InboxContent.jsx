import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function InboxContent() {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/inbox")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                setEmails(data);
                } else {
                console.error("Inbox error:", data.error);
                setEmails([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="gap-4 grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 p-6">
            {loading && <div className="text-white/80">Loading emails...</div>}
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
