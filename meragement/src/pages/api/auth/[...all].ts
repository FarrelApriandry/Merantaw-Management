// src/pages/api/auth/[...all].ts — satu endpoint untuk seluruh alur better-auth.
// Client mengarah ke /api/auth/* (sign-in, sign-out, get-session, admin, dst).
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  return auth.handler(ctx.request);
};
