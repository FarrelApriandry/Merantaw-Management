import Imap from "imap-simple";

const config = {
  imap: {
    user: "merantawid@gmail.com",
    password: "ussothrfdgyyzmjr",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  },
};

Imap.connect(config)
  .then((conn) => {
    console.log("✅ Connected successfully!");
    conn.end();
  })
  .catch((err) => console.error("❌ IMAP connection failed:", err.message));
