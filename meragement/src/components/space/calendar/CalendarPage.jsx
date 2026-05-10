import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import _withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { onListsSnapshot, onEventsSnapshot, createEvent, updateEvent, deleteEvent, updateTask } from "@/lib/firestore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ListTodo, Trash2, CheckCircle, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const withDragAndDrop = _withDragAndDrop.default || _withDragAndDrop;
const DnDCalendar = withDragAndDrop(Calendar);
const locales = { "id": idLocale };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

function toDate(val) {
  if (!val) return null;
  if (val.seconds) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  return new Date(val);
}

// Custom event component with icons
function EventComponent({ event }) {
  const icon = event.type === "task"
    ? <CheckCircle size={10} className="shrink-0" />
    : <CalendarDays size={10} className="shrink-0" />;

  return (
    <div className="flex items-center gap-1 truncate px-1">
      {icon}
      <span className="truncate text-[11px]">{event.title}</span>
    </div>
  );
}

export default function CalendarPage({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [taskListMap, setTaskListMap] = useState({}); // taskId -> listId
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSlot, setNewSlot] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [dropAnim, setDropAnim] = useState(null);

  // Fetch tasks across all lists (track listId per task)
  useEffect(() => {
    if (!projectId) return;
    let listUnsubs = [];

    const unsubLists = onListsSnapshot(projectId, (lists) => {
      listUnsubs.forEach((u) => u());
      listUnsubs = [];
      const byList = {};
      const listMap = {};

      lists.forEach((list) => {
        const colRef = collection(db, `projects/${projectId}/lists/${list.id}/tasks`);
        const unsub = onSnapshot(colRef, (snap) => {
          byList[list.id] = snap.docs.map((d) => {
            listMap[d.id] = list.id;
            return { id: d.id, ...d.data() };
          });
          setTaskListMap({ ...listMap });
          setTasks(Object.values(byList).flat());
        });
        listUnsubs.push(unsub);
      });

      if (!lists.length) setTasks([]);
    });

    return () => { unsubLists(); listUnsubs.forEach((u) => u()); };
  }, [projectId]);

  // Fetch events
  useEffect(() => {
    if (!projectId) return;
    return onEventsSnapshot(projectId, setEvents);
  }, [projectId]);

  // Map to RBC format
  const calendarEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: t.id,
        title: t.title,
        start: toDate(t.dueDate),
        end: toDate(t.dueDate),
        type: "task",
        status: t.status,
        listId: taskListMap[t.id],
        resource: t,
      }));

    const customEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: toDate(e.start),
      end: toDate(e.end) || toDate(e.start),
      type: "event",
      color: e.color || "#8b5cf6",
      resource: e,
    }));

    return [...taskEvents, ...customEvents];
  }, [tasks, events, taskListMap]);

  const eventStyleGetter = useCallback((event) => {
    const base = { border: "none", borderRadius: "6px", fontSize: "11px", padding: "2px 4px" };
    if (event.type === "task") {
      const bg = event.status === "done" ? "#10b981" : event.status === "in_progress" ? "#f59e0b" : "#3b82f6";
      return { style: { ...base, backgroundColor: bg } };
    }
    return { style: { ...base, backgroundColor: event.color } };
  }, []);

  // DnD: Move event
  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    const toastId = toast.loading("Syncing...");
    try {
      if (event.type === "task" && event.listId) {
        await updateTask(projectId, event.listId, event.id, { dueDate: start });
      } else if (event.type === "event") {
        await updateEvent(projectId, event.id, { start, end });
      }
      setDropAnim(event.id);
      setTimeout(() => setDropAnim(null), 600);
      toast.success("Updated!", { id: toastId });
    } catch {
      toast.error("Failed to sync", { id: toastId });
    }
  }, [projectId]);

  // DnD: Resize event
  const handleEventResize = useCallback(async ({ event, start, end }) => {
    const toastId = toast.loading("Syncing...");
    try {
      if (event.type === "event") {
        await updateEvent(projectId, event.id, { start, end });
      } else if (event.type === "task" && event.listId) {
        await updateTask(projectId, event.listId, event.id, { dueDate: start });
      }
      setDropAnim(event.id);
      setTimeout(() => setDropAnim(null), 600);
      toast.success("Updated!", { id: toastId });
    } catch {
      toast.error("Failed to sync", { id: toastId });
    }
  }, [projectId]);

  // Range selection → create event
  const handleSelectSlot = (slotInfo) => {
    setNewSlot(slotInfo);
    setNewTitle("");
    setCreateOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newTitle.trim() || !newSlot) return;
    await createEvent(projectId, {
      title: newTitle.trim(),
      start: newSlot.start,
      end: newSlot.end,
      color: "#8b5cf6",
    });
    setCreateOpen(false);
    toast.success("Event created");
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.type !== "event") return;
    await deleteEvent(projectId, selectedEvent.id);
    setSelectedEvent(null);
    toast.success("Event deleted");
  };

  // Custom event wrapper with drop animation
  const EventWrapper = useCallback(({ event, children }) => {
    const isAnimating = dropAnim === event.id;
    return (
      <motion.div
        animate={isAnimating ? { scale: [1.15, 1] } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }, [dropAnim]);

  return (
    <div className="p-6 bg-[#0D132B] rounded-xl border border-white/5 text-white min-h-[80vh]">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-white/60">Drag & drop to reschedule • Click range to create</p>
      </header>

      <div className="rbc-dark-theme rounded-xl overflow-hidden border border-white/10">
        <DnDCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          views={["month", "week", "day"]}
          selectable
          resizable
          onSelectEvent={(e) => setSelectedEvent(e)}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventStyleGetter}
          components={{ event: EventComponent, eventWrapper: EventWrapper }}
          style={{ height: "70vh" }}
          popup
          draggableAccessor={() => true}
        />
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="bg-[#0D132B] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === "task" ? <ListTodo size={18} /> : <CalendarDays size={18} />}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge className={selectedEvent?.type === "task" ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"}>
                {selectedEvent?.type}
              </Badge>
              {selectedEvent?.status && (
                <Badge className="bg-white/10 text-white/70">{selectedEvent.status}</Badge>
              )}
            </div>
            <div className="text-white/60 font-mono text-xs space-y-1">
              <p>Start: {selectedEvent?.start && format(selectedEvent.start, "PPP p", { locale: idLocale })}</p>
              {selectedEvent?.end && selectedEvent.start?.getTime() !== selectedEvent.end?.getTime() && (
                <p>End: {format(selectedEvent.end, "PPP p", { locale: idLocale })}</p>
              )}
            </div>
          </div>
          {selectedEvent?.type === "event" && (
            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={handleDeleteEvent}>
                <Trash2 size={14} /> Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog (range-aware) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0D132B] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Event name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-transparent border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
              />
            </div>
            {newSlot && (
              <div className="text-xs text-white/50 font-mono space-y-1 p-2 rounded bg-white/5">
                <p>From: {format(newSlot.start, "PPP", { locale: idLocale })}</p>
                {newSlot.end && newSlot.start.getTime() !== newSlot.end.getTime() && (
                  <p>To: {format(newSlot.end, "PPP", { locale: idLocale })}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!newTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .rbc-dark-theme .rbc-calendar { background: #0a0f1f; color: #e2e8f0; }
        .rbc-dark-theme .rbc-toolbar { padding: 12px 16px; margin-bottom: 0; }
        .rbc-dark-theme .rbc-toolbar button {
          color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px 12px; background: rgba(255,255,255,0.05);
        }
        .rbc-dark-theme .rbc-toolbar button:hover,
        .rbc-dark-theme .rbc-toolbar button.rbc-active {
          background: rgba(59,130,246,0.2); color: #fff; border-color: rgba(59,130,246,0.4);
        }
        .rbc-dark-theme .rbc-header {
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px; font-weight: 500; color: #94a3b8; font-size: 12px;
        }
        .rbc-dark-theme .rbc-month-view, .rbc-dark-theme .rbc-time-view { border: none; }
        .rbc-dark-theme .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.05); }
        .rbc-dark-theme .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.05); }
        .rbc-dark-theme .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
        .rbc-dark-theme .rbc-today { background: rgba(59,130,246,0.08); }
        .rbc-dark-theme .rbc-event { padding: 1px 4px; }
        .rbc-dark-theme .rbc-event-label { display: none; }
        .rbc-dark-theme .rbc-show-more { color: #60a5fa; font-size: 11px; }
        .rbc-dark-theme .rbc-date-cell { padding: 4px 8px; font-size: 12px; color: #94a3b8; font-family: monospace; }
        .rbc-dark-theme .rbc-off-range { color: #475569; }
        .rbc-dark-theme .rbc-time-header-content,
        .rbc-dark-theme .rbc-time-content { border-left: 1px solid rgba(255,255,255,0.05); }
        .rbc-dark-theme .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .rbc-dark-theme .rbc-time-slot { color: #64748b; font-size: 11px; font-family: monospace; }
        .rbc-dark-theme .rbc-current-time-indicator { background-color: #ef4444; }
        .rbc-dark-theme .rbc-slot-selection { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.5); border-radius: 4px; }
        .rbc-dark-theme .rbc-selected-cell { background: rgba(59,130,246,0.1); }
        .rbc-dark-theme .rbc-addons-dnd .rbc-addons-dnd-row-body { position: relative; }
        .rbc-dark-theme .rbc-addons-dnd-drag-preview { opacity: 0.7; }
        .rbc-dark-theme .rbc-addons-dnd .rbc-addons-dnd-over {
          background: rgba(139,92,246,0.1); border: 1px dashed rgba(139,92,246,0.5); border-radius: 4px;
        }
        .rbc-dark-theme .rbc-addons-dnd-resize-ns-icon,
        .rbc-dark-theme .rbc-addons-dnd-resize-ew-icon { display: none; }
      `}</style>
    </div>
  );
}
