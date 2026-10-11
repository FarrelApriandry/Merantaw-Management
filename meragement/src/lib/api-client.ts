// src/lib/api-client.ts — fetch wrapper typed untuk /api/* (pengganti Firestore SDK).
// Session terkirim otomatis via cookie same-origin (better-auth). Throw Error
// dengan pesan server ({ error }) agar komponen tinggal toast.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const apiGet = <T>(path: string): Promise<T> => api<T>(path);

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });

export const apiDelete = <T>(path: string): Promise<T> => api<T>(path, { method: "DELETE" });

// Interval polling pengganti onSnapshot. Kembalikan cleanup untuk useEffect.
export function poll(fn: () => void, ms: number): () => void {
  const t = setInterval(fn, ms);
  return () => clearInterval(t);
}
