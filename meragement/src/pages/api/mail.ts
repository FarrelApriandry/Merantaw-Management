// src/pages/api/mail.ts — legacy empty endpoint preserved as typed stub.
// Original mail.js was 0 bytes (no logic). Keep stub to avoid 404.
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ error: "mail endpoint not implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
