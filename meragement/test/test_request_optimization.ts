// test/test_request_optimization.ts — Unit tests untuk optimasi request, visibility guard, dan smart polling.
import assert from "node:assert/strict";

console.log("🧪 Running unit tests for request optimization & smart polling...");

// 1. Mocking Environment Browser sederhana untuk simulasi Tab Visibility
type EventHandler = (event?: unknown) => void;

class MockDocument {
  hidden: boolean = false;
  visibilityState: "visible" | "hidden" = "visible";
  private listeners: Map<string, Set<EventHandler>> = new Map();

  addEventListener(type: string, handler: EventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: EventHandler) {
    this.listeners.get(type)?.delete(handler);
  }

  trigger(type: string) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const h of handlers) h();
    }
  }

  setTabHidden(hidden: boolean) {
    this.hidden = hidden;
    this.visibilityState = hidden ? "hidden" : "visible";
    this.trigger("visibilitychange");
  }
}

class MockWindow {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  addEventListener(type: string, handler: EventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: EventHandler) {
    this.listeners.get(type)?.delete(handler);
  }

  trigger(type: string) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const h of handlers) h();
    }
  }
}

const mockDoc = new MockDocument();
const mockWin = new MockWindow();

// Pasang mock ke global
(globalThis as unknown as { document: MockDocument }).document = mockDoc;
(globalThis as unknown as { window: MockWindow }).window = mockWin;

// 2. Test Smart Polling Simulation Logic
console.log("  ► Testing Smart Polling tab-visibility logic...");

let pollExecutionCount = 0;
const pollIntervalMs = 50;

function createSmartPoller(
  callback: () => void,
  intervalMs: number,
  doc: MockDocument,
  win: MockWindow
) {
  let timer: NodeJS.Timeout | null = null;
  let lastRun = 0;

  const execute = () => {
    lastRun = Date.now();
    callback();
  };

  const startTimer = () => {
    if (timer) clearInterval(timer);
    if (!doc.hidden) {
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
    if (doc.hidden) {
      stopTimer();
    } else {
      if (Date.now() - lastRun > 10) {
        execute();
      }
      startTimer();
    }
  };

  const handleFocus = () => {
    if (!doc.hidden && Date.now() - lastRun > 10) {
      execute();
    }
  };

  startTimer();
  doc.addEventListener("visibilitychange", handleVisibilityChange);
  win.addEventListener("focus", handleFocus);

  return {
    cleanup() {
      stopTimer();
      doc.removeEventListener("visibilitychange", handleVisibilityChange);
      win.removeEventListener("focus", handleFocus);
    },
    isTimerRunning: () => timer !== null,
  };
}

const poller = createSmartPoller(
  () => {
    pollExecutionCount++;
  },
  pollIntervalMs,
  mockDoc,
  mockWin
);

// Verifikasi poller aktif saat tab visible
assert.equal(poller.isTimerRunning(), true, "Timer harus aktif saat tab visible");

// Simulasi user minimize / pindah tab
mockDoc.setTabHidden(true);
assert.equal(poller.isTimerRunning(), false, "Timer harus berhenti saat tab hidden (background)");
const countWhileHidden = pollExecutionCount;

// Tunggu beberapa interval untuk memastikan tidak ada eksekusi sama sekali saat tab hidden
await new Promise((r) => setTimeout(r, 120));
assert.equal(
  pollExecutionCount,
  countWhileHidden,
  "Tidak boleh ada polling request yang tertembak saat tab sedang hidden"
);
console.log("    ✓ Zero-request saat tab hidden terverifikasi!");

// Simulasi user kembali ke tab (tab active kembali)
mockDoc.setTabHidden(false);
assert.equal(poller.isTimerRunning(), true, "Timer harus aktif kembali saat tab dibuka lagi");
assert.ok(
  pollExecutionCount > countWhileHidden,
  "Callback harus langsung dipanggil seketika saat user kembali ke tab"
);
console.log("    ✓ Immediate refresh saat tab dibuka kembali terverifikasi!");

poller.cleanup();
assert.equal(poller.isTimerRunning(), false, "Timer harus ter-cleanup sempurna");

// 3. Test Dashboard Aggregation Calculation Logic
console.log("  ► Testing Dashboard Summary aggregation calculation...");

interface TaskSample {
  id: string;
  projectId: string;
  status: string;
  updatedAt: Date;
}

const mockProjects = [
  { id: "p1", title: "Project Alpha" },
  { id: "p2", title: "Project Beta" },
  { id: "p3", title: "Project Gamma" }, // empty project
];

const mockTasks: TaskSample[] = [
  { id: "t1", projectId: "p1", status: "done", updatedAt: new Date("2026-11-01") },
  { id: "t2", projectId: "p1", status: "in_progress", updatedAt: new Date("2026-11-02") },
  { id: "t3", projectId: "p1", status: "done", updatedAt: new Date("2026-11-03") },
  { id: "t4", projectId: "p2", status: "todo", updatedAt: new Date("2026-11-04") },
  { id: "t5", projectId: "p2", status: "done", updatedAt: new Date("2026-11-05") },
];

function calculateDashboardSummary(projects: { id: string; title: string }[], tasks: TaskSample[]) {
  const totalCount = tasks.length;
  let doneCount = 0;
  const projectTotal = new Map<string, number>();
  const projectDone = new Map<string, number>();

  for (const t of tasks) {
    projectTotal.set(t.projectId, (projectTotal.get(t.projectId) ?? 0) + 1);
    if (t.status === "done") {
      doneCount++;
      projectDone.set(t.projectId, (projectDone.get(t.projectId) ?? 0) + 1);
    }
  }

  const progressByProject: Record<string, number> = {};
  for (const p of projects) {
    const total = projectTotal.get(p.id) ?? 0;
    const done = projectDone.get(p.id) ?? 0;
    progressByProject[p.id] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  const sortedTasks = [...tasks].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return {
    totalCount,
    doneCount,
    progressByProject,
    recentTasks: sortedTasks.slice(0, 3),
  };
}

const summary = calculateDashboardSummary(mockProjects, mockTasks);
assert.equal(summary.totalCount, 5, "Total task count harus 5");
assert.equal(summary.doneCount, 3, "Total done task count harus 3");
assert.equal(summary.progressByProject["p1"], 67, "Project Alpha: 2 done dari 3 total = 67%");
assert.equal(summary.progressByProject["p2"], 50, "Project Beta: 1 done dari 2 total = 50%");
assert.equal(summary.progressByProject["p3"], 0, "Project Gamma: 0 task = 0%");
assert.equal(summary.recentTasks[0].id, "t5", "Recent task teratas harus t5 (update terbaru)");
console.log("    ✓ Dashboard summary calculation terverifikasi akurat!");

// 4. Test SSE Connection Lifetime Management on Hidden
console.log("  ► Testing SSE disconnect on tab hidden...");

let sseClosed = false;
let sseOpened = false;

class MockEventSource {
  static CLOSED = 2;
  readyState = 1;
  url: string;
  constructor(url: string) {
    this.url = url;
    sseOpened = true;
  }
  close() {
    this.readyState = MockEventSource.CLOSED;
    sseClosed = true;
  }
  addEventListener() {}
}

(globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;

function simulateSseHook(doc: MockDocument) {
  let source: MockEventSource | null = null;

  const connect = () => {
    if (!doc.hidden) {
      source = new MockEventSource("/api/projects/123/stream");
    }
  };

  const handleVisibility = () => {
    if (doc.hidden) {
      if (source) {
        source.close();
        source = null;
      }
    } else {
      connect();
    }
  };

  connect();
  doc.addEventListener("visibilitychange", handleVisibility);

  return {
    getSource: () => source,
  };
}

mockDoc.setTabHidden(false);
const sseWatcher = simulateSseHook(mockDoc);
assert.ok(sseWatcher.getSource() !== null, "SSE harus tersambung saat tab visible");

mockDoc.setTabHidden(true);
assert.equal(sseWatcher.getSource(), null, "SSE harus ditutup saat tab hidden");
assert.equal(sseClosed, true, "SSE close() harus terpanggil");
console.log("    ✓ SSE auto-disconnect saat tab hidden terverifikasi!");

console.log("\n🎉 ALL REQUEST OPTIMIZATION UNIT TESTS PASSED SUCCESSFULLY!");
