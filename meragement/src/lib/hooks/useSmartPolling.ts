// src/lib/hooks/useSmartPolling.ts — Polling cerdas ramah resource & CDN.
// Fitur:
// 1. Pause otomatis saat tab di-minimize atau tidak aktif (document.hidden = true).
// 2. Langsung refetch data secara instan saat tab dibuka kembali (visibilitychange / window focus).
// 3. Menghindari kebocoran request saat browser ditinggal tidur atau di-minimize.
import { useEffect, useRef } from "react";

export interface SmartPollingOptions {
  intervalMs: number;
  enabled?: boolean;
  /** Panggil callback segera saat komponen pertama kali mount (default: false) */
  runOnMount?: boolean;
}

export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: number | SmartPollingOptions
): void {
  const intervalMs = typeof options === "number" ? options : options.intervalMs;
  const enabled = typeof options === "number" ? true : (options.enabled ?? true);
  const runOnMount = typeof options === "number" ? false : (options.runOnMount ?? false);

  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let lastRun = 0;

    const execute = () => {
      lastRun = Date.now();
      void cbRef.current();
    };

    const startTimer = () => {
      if (timer) clearInterval(timer);
      if (!document.hidden) {
        timer = setInterval(execute, intervalMs);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        // Jika tab kembali aktif dan jeda dari run terakhir sudah melebihi 3 detik,
        // segera ambil data terbaru.
        if (Date.now() - lastRun > 3000) {
          execute();
        }
        startTimer();
      }
    };

    const handleFocus = () => {
      if (!document.hidden && Date.now() - lastRun > 5000) {
        execute();
      }
    };

    if (runOnMount) {
      execute();
    }

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [intervalMs, enabled, runOnMount]);
}
