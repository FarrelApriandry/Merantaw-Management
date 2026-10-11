import { neon } from "@neondatabase/serverless";
import "dotenv/config";
const sql = neon(process.env.DATABASE_URL);
const d = await sql`DELETE FROM "user" WHERE email LIKE '%@meragement.dev' RETURNING email`;
const c = await sql`SELECT count(*)::int AS n FROM "user"`;
console.log("cleanup:", d.map(x=>x.email).join(", "), "| user tersisa:", c[0].n);
