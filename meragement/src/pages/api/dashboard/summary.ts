// src/pages/api/dashboard/summary.ts — Ringkasan progress & tasks dashboard dalam 1 kali request.
// Menghilangkan N+1 API waterfall di DashboardContent.
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { desc, inArray, sql } from "drizzle-orm";
import { requireUser, json } from "@/lib/server-auth";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  if (!me) return json({ error: "unauthorized" }, 401);

  // Ambil projects yang berhak diakses user
  let projectRows;
  if (me.role === "admin") {
    projectRows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  } else {
    projectRows = await db
      .select()
      .from(projects)
      .where(sql`${me.id} = ANY(${projects.assignedUsers})`)
      .orderBy(desc(projects.updatedAt));
  }

  const projectList = projectRows.map((p) => ({
    id: p.id,
    title: p.title,
    shortCall: p.shortCall ?? "",
    description: p.description ?? "",
    status: p.status,
    priority: p.priority,
    teamId: p.teamId,
    assignedUsers: p.assignedUsers ?? [],
    createdBy: p.createdBy,
    startDate: p.startDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  if (projectList.length === 0) {
    return json(
      {
        projects: [],
        progressByProject: {},
        totalCount: 0,
        doneCount: 0,
        recentTasks: [],
      },
      200
    );
  }

  const pIds = projectList.map((p) => p.id);
  const pTitleMap = new Map<string, string>();
  for (const p of projectList) pTitleMap.set(p.id, p.title);

  // Ambil tasks lintas project dalam 1 kali query
  const taskRows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      listId: tasks.listId,
      title: tasks.title,
      status: tasks.status,
      category: tasks.category,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate,
      link: tasks.link,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(inArray(tasks.projectId, pIds))
    .orderBy(desc(tasks.updatedAt));

  const totalCount = taskRows.length;
  let doneCount = 0;
  const projectTotal = new Map<string, number>();
  const projectDone = new Map<string, number>();

  for (const t of taskRows) {
    projectTotal.set(t.projectId, (projectTotal.get(t.projectId) ?? 0) + 1);
    if (t.status === "done") {
      doneCount++;
      projectDone.set(t.projectId, (projectDone.get(t.projectId) ?? 0) + 1);
    }
  }

  const progressByProject: Record<string, number> = {};
  for (const p of projectList) {
    const total = projectTotal.get(p.id) ?? 0;
    const done = projectDone.get(p.id) ?? 0;
    progressByProject[p.id] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // 10 tasks terbaru dengan judul project
  const recentTasks = taskRows.slice(0, 10).map((t) => ({
    ...t,
    projectTitle: pTitleMap.get(t.projectId) ?? "",
  }));

  return json(
    {
      projects: projectList,
      progressByProject,
      totalCount,
      doneCount,
      recentTasks,
    },
    200
  );
};
