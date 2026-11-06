// src/lib/hooks/useSpaceEvents.ts — subscribe SSE dari /api/projects/<id>/stream.
//
// Optimasi Resource:
// - Hanya membuka koneksi EventSource saat tab aktif/terlihat (document.visibilityState === "visible").
// - Saat tab di-minimize / pindah tab, koneksi langsung ditutup rapi agar serverless compute Vercel tidak berjalan di background.
// - Saat kembali ke tab, otomatis reconnect dan langsung memicu onChange() agar view ter-update seketika.
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

    const cleanupSource = (): void => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (source) {
        source.close();
        source = null;
      }
    };

    const connect = (): void => {
      if (disposed || document.hidden) return;
      cleanupSource();

      source = new EventSource(`/api/projects/${projectId}/stream`);

      // `init` = baseline dari server; cukup diabaikan, view sudah memuat data sendiri.
      source.addEventListener("init", () => { /* baseline — tidak ada aksi */ });

      source.addEventListener("change", () => {
        onChangeRef.current();
      });

      source.addEventListener("error", () => {
        // EventSource auto-reconnect sendiri; handler hanya menandai supaya
        // cleanup tidak membiarkan listener menggantung jika sudah CLOSED.
        if (source?.readyState === EventSource.CLOSED) {
          source = null;
          if (!disposed && !document.hidden) {
            // Coba lagi setelah jeda pendek (server kadang tertidur di fluid compute).
            retryTimer = setTimeout(connect, 5000);
          }
        }
      });
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        // Tab tidak aktif -> tutup koneksi agar hemat Vercel Compute & Fast Origin Transfer
        cleanupSource();
      } else {
        // Tab aktif kembali -> langsung refresh data dan buka kembali SSE
        onChangeRef.current();
        connect();
      }
    };

    if (!document.hidden) {
      connect();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      cleanupSource();
    };
  }, [projectId, enabled]);
}
