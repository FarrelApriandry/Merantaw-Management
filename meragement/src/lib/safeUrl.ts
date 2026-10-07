// src/lib/safeUrl.ts — P0: cegah XSS / open-redirect via task.link
export function safeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Tolak javascript:, data:, vbscript:, file:, blob: dsb.
  // Hanya izinkan http/https absolut.
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function openSafeUrl(input: unknown): boolean {
  const url = safeUrl(input);
  if (!url) return false;
  // noopener+noreferrer cegah window.opener hijack
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
