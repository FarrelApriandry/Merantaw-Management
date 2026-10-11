// src/components/ui/feedback.tsx — shared loading & empty states.
// Dipakai semua list page biar konsisten: skeleton saat loading,
// empty state dengan cross-link action (bukan teks "No X yet" polos).
import type { JSX, ReactNode } from "react";
import { Inbox } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }): JSX.Element {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Memuat…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, hint, actionLabel, actionHref, icon }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="text-white/30">{icon ?? <Inbox size={28} />}</div>
      <p className="text-sm font-medium text-white/80">{title}</p>
      {hint && <p className="text-xs text-white/50 max-w-xs">{hint}</p>}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-500/30 transition"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
