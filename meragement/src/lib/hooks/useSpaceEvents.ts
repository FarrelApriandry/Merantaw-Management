// src/lib/hooks/useSpaceEvents.ts — subscribe SSE dari /api/projects/<id>/stream.
//
// Pengganti onSnapshot: server kirim `event: change` tiap ada write di project ini,
// hook memanggil `onChange` supaya view refetch. Ini MELENGKAPI polling, bukan
// menggantinya — kalau SSE putus (sleep laptop, CF reconnect, tab lama) polling
// 10-15 detik di masing-masing view tetap jadi jaring pengaman.
//
// Fallback senyap: EventSource tidak tersedia / 401 / 403 → tidak melakukan apa pun.
import { useEffect, useRef } from "react";

export interface UseSpaceEventsOptions {
  projectId: string | undefined;
  /** Dipanggil saat server memberi tahu ada perubahan. */
  onChange: () => void;
  enabled?: boolean;
}

export function useSpaceEvents({ projectId, onChange, enabled = true }: UseSpaceEventsOptions): void {
  // onChange sering inline arrow → tidak boleh jadi dependency effect, kalau tidak
  // tiap render akan reconnect EventSource.
  const onChangeRef = useRef<() => void>(() => {});
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!projectId || !enabled) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let disposed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (disposed) return;
      source = new EventSource(`/api/projects/${projectId}/stream`);

      // `init` = baseline dari server; cukup diabaikan, view sudah memuat data sendiri.
      source.addEventListener("init", () => { /* baseline — tidak ada aksi */ });

      source.addEventListener("change", () => {
        onChangeRef.current();
      });

      source.addEventListener("error", () => {
        // EventSource auto-reconnect sendiri; handler hanya menandai supaya
        // cleanup tidak membiarkan listener menggantung.
        if (source?.readyState === EventSource.CLOSED) {
          source = null;
          if (!disposed) {
            // Coba lagi setelah jeda pendek (server kadang tertidur di fluid compute).
            retryTimer = setTimeout(connect, 5000);
          }
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [projectId, enabled]);
}
