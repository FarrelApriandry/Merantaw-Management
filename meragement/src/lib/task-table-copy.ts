import type { AppUser, FirestoreTimestampLike, Task } from "@/lib/types";
import { toDateSafe } from "@/lib/types";

export interface TaskCopyItem {
  index: number;
  id: string;
  title: string;
  status: string;
  rawStatus: string;
  assignees: string;
  dueDate: string;
  category: string;
  link: string;
  listName?: string;
}

export type CopyFormat = "markdown" | "list" | "csv";
export type CopyScope = "selected" | "active_list" | "all_space";

/**
 * Format status task menjadi teks yang rapi dan mudah dibaca manusia.
 */
export function formatTaskStatus(status?: string): string {
  if (!status) return "-";
  switch (status.toLowerCase()) {
    case "done":
      return "Done";
    case "in_progress":
    case "in-progress":
      return "In Progress";
    case "todo":
    case "to_do":
      return "To Do";
    case "draft":
      return "Draft";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Format tanggal batas waktu (due date) ke format tanggal lokal Indonesia (misal: "24 Okt 2026").
 */
export function formatTaskDueDate(due: FirestoreTimestampLike): string {
  const d = toDateSafe(due);
  if (!d) return "-";
  try {
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.toISOString().split("T")[0];
  }
}

/**
 * Petakan ID assignee menjadi nama-nama pengguna (atau email jika nama belum diset).
 */
export function resolveAssigneeNames(
  assignedTo: string | string[] | undefined,
  members: AppUser[] = []
): string {
  if (!assignedTo) return "-";
  const ids = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  if (ids.length === 0) return "-";

  const memberMap = new Map<string, string>();
  for (const m of members) {
    memberMap.set(m.id, m.name?.trim() || m.email || m.id);
  }

  const names = ids.map((id) => memberMap.get(id) || id).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "-";
}

/**
 * Format array kategori menjadi string yang dipisahkan koma.
 */
export function formatCategories(categories?: string[]): string {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return "-";
  }
  const clean = categories.map((c) => c.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join(", ") : "-";
}

/**
 * Konversi sebuah Task ke TaskCopyItem yang siap diformat.
 */
export function taskToCopyItem(
  task: Task,
  index: number,
  members: AppUser[] = [],
  listName?: string
): TaskCopyItem {
  return {
    index,
    id: task.id,
    title: task.title?.trim() || "Untitled Task",
    status: formatTaskStatus(task.status),
    rawStatus: task.status || "",
    assignees: resolveAssigneeNames(task.assignedTo, members),
    dueDate: formatTaskDueDate(task.dueDate),
    category: formatCategories(task.category),
    link: task.link?.trim() || "-",
    listName,
  };
}

/**
 * Escape karakter pipa (|) dan newline pada sel Markdown agar tidak merusak tabel.
 */
function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Hasilkan Tabel Markdown dengan kolom yang ter-padding sejajar (monospaced alignment).
 */
export function generateMarkdownTable(
  items: TaskCopyItem[],
  options: { includeList?: boolean } = {}
): string {
  if (items.length === 0) return "_Tidak ada task untuk ditampilkan._";

  const hasList = Boolean(options.includeList);

  const headers = hasList
    ? ["No", "List", "Task", "Status", "Assignee", "Tenggat", "Kategori"]
    : ["No", "Task", "Status", "Assignee", "Tenggat", "Kategori"];

  const rawRows: string[][] = items.map((item) => {
    const row = [
      String(item.index),
      escapeMarkdownCell(item.title),
      escapeMarkdownCell(item.status),
      escapeMarkdownCell(item.assignees),
      escapeMarkdownCell(item.dueDate),
      escapeMarkdownCell(item.category),
    ];
    if (hasList) {
      row.splice(1, 0, escapeMarkdownCell(item.listName || "-"));
    }
    return row;
  });

  // Hitung lebar maksimum untuk setiap kolom
  const colWidths = headers.map((header, colIndex) => {
    const maxDataWidth = rawRows.reduce(
      (max, row) => Math.max(max, row[colIndex]?.length || 0),
      0
    );
    return Math.max(header.length, maxDataWidth);
  });

  // Buat baris header
  const headerLine =
    "| " +
    headers
      .map((h, i) => h.padEnd(colWidths[i], " "))
      .join(" | ") +
    " |";

  // Buat baris pembatas (delimiter line)
  const delimiterLine =
    "|:" +
    colWidths
      .map((w) => "-".repeat(Math.max(w - 1, 2)))
      .join("-|:") +
    "-|";

  // Buat setiap baris data
  const dataLines = rawRows.map((row) => {
    return (
      "| " +
      row
        .map((cell, i) => cell.padEnd(colWidths[i], " "))
        .join(" | ") +
      " |"
    );
  });

  return [headerLine, delimiterLine, ...dataLines].join("\n");
}

/**
 * Hasilkan HTML Table dengan inline style rapi untuk clipboard (mendukung paste ke Excel/Sheets/Docs).
 */
export function generateHtmlTable(
  items: TaskCopyItem[],
  options: { includeList?: boolean } = {}
): string {
  if (items.length === 0) return "<p><em>Tidak ada task untuk ditampilkan.</em></p>";

  const hasList = Boolean(options.includeList);

  const headers = hasList
    ? ["No", "List", "Task", "Status", "Assignee", "Tenggat", "Kategori"]
    : ["No", "Task", "Status", "Assignee", "Tenggat", "Kategori"];

  const thStyles =
    "border: 1px solid #cbd5e1; background-color: #0f172a; color: #ffffff; padding: 8px 12px; font-weight: 600; text-align: left;";
  const tdStyles =
    "border: 1px solid #cbd5e1; padding: 7px 12px; font-size: 13px; color: #0f172a; text-align: left;";

  const headerHtml = `<tr>${headers.map((h) => `<th style="${thStyles}">${h}</th>`).join("")}</tr>`;

  const rowsHtml = items
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cols = [
        String(item.index),
        item.title,
        item.status,
        item.assignees,
        item.dueDate,
        item.category,
      ];

      if (hasList) {
        cols.splice(1, 0, item.listName || "-");
      }

      return `<tr style="background-color: ${bg};">${cols
        .map((c) => `<td style="${tdStyles}">${escapeHtml(c)}</td>`)
        .join("")}</tr>`;
    })
    .join("");

  return `<table style="border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; border: 1px solid #cbd5e1;"><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Hasilkan format daftar teks terstruktur yang ramah dibaca di aplikasi chat (WhatsApp, Slack, Telegram).
 */
export function generateTextList(
  items: TaskCopyItem[],
  metadata: { projectName?: string; listName?: string } = {}
): string {
  if (items.length === 0) return "Tidak ada task untuk ditampilkan.";

  const lines: string[] = [];
  const project = metadata.projectName?.trim();
  const list = metadata.listName?.trim();

  if (project) {
    lines.push(`📋 DAFTAR TASK: ${project}`);
  } else {
    lines.push(`📋 DAFTAR TASK`);
  }

  if (list) {
    lines.push(`📁 List: ${list} (Total: ${items.length} task)`);
  } else {
    lines.push(`📊 Total: ${items.length} task`);
  }

  lines.push("─".repeat(44));

  for (const item of items) {
    lines.push(`${item.index}. ${item.title}`);
    if (item.listName && !list) {
      lines.push(`   📁 List     : ${item.listName}`);
    }
    lines.push(`   • Status   : ${item.status}`);
    lines.push(`   • Assignee : ${item.assignees}`);
    lines.push(`   • Tenggat  : ${item.dueDate}`);
    if (item.category && item.category !== "-") {
      lines.push(`   • Kategori : ${item.category}`);
    }
    lines.push("");
  }

  lines.push("─".repeat(44));
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  lines.push(`Disalin dari Meragement • ${today}`);

  return lines.join("\n");
}

/**
 * Hasilkan CSV standar (RFC 4180) yang bisa langsung dibuka di Excel atau Google Sheets.
 */
export function generateCsv(
  items: TaskCopyItem[],
  options: { includeList?: boolean } = {}
): string {
  const hasList = Boolean(options.includeList);

  const headers = hasList
    ? ["No", "List", "Task", "Status", "Assignee", "Tenggat", "Kategori"]
    : ["No", "Task", "Status", "Assignee", "Tenggat", "Kategori"];

  const escapeCsv = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = items.map((item) => {
    const row = [
      String(item.index),
      item.title,
      item.status,
      item.assignees,
      item.dueDate,
      item.category,
    ];
    if (hasList) {
      row.splice(1, 0, item.listName || "-");
    }
    return row.map(escapeCsv).join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Salin data task ke clipboard browser dengan multi-tier fallback:
 * 1. navigator.clipboard.write([ClipboardItem({ text/plain, text/html })]) -> untuk paste ke spreadsheet & rich text docs
 * 2. navigator.clipboard.writeText(plainText) -> fallback jika ClipboardItem diblokir
 * 3. document.execCommand("copy") -> legacy fallback
 */
export async function copyTasksToClipboard(
  plainText: string,
  htmlText?: string
): Promise<boolean> {
  // Tier 1: Modern Clipboard API dengan MIME text/plain + text/html
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof window.ClipboardItem !== "undefined"
  ) {
    try {
      const clipboardData: Record<string, Blob> = {
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      };
      if (htmlText) {
        clipboardData["text/html"] = new Blob([htmlText], { type: "text/html" });
      }
      await navigator.clipboard.write([new window.ClipboardItem(clipboardData)]);
      return true;
    } catch {
      // Jika penulisan HTML ditolak browser, lanjutkan ke tier berikutnya
    }
  }

  // Tier 2: navigator.clipboard.writeText (plain text saja)
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      // Lanjut ke legacy fallback
    }
  }

  // Tier 3: Legacy document.execCommand("copy")
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = plainText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  return false;
}
