// src/lib/db/schema.ts — Skema Postgres (Neon) pengganti Firestore Meragement.
// Pemetaan dari Firestore: users, users_public, teams, projects/{pid},
// projects/{pid}/lists/{lid}/tasks, docs, discussions, replies, events.
// Firestore rules DITERJEMAHKAN di API layer (src/pages/api/**), bukan di sini.
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ─── better-auth core tables ─────────────────────────────────
// Struktur mengikuti konvensi better-auth (drizzle adapter).
// `role` + `isActive` = additionalFields, pengganti dokumen users/{uid} lama.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  // Kolom plugin admin better-auth (ban/unban)
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"), // bcrypt hash — credential provider
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Teams ───────────────────────────────────────────────────
// rules: teams read = any signed-in; write = admin only (diterjemahkan di API).
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// team.members: [{userId, roles[]}] di Firestore → child table.
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roles: text("roles").array().notNull().default([]),
  },
  (t) => [unique("team_members_team_user_uq").on(t.teamId, t.userId)],
);

// ─── Projects ────────────────────────────────────────────────
// rules: read = admin | member (assigned_users); write = admin,
// kecuali field operasional boleh diubah member (dicek di API).
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    shortCall: text("short_call").default(""),
    description: text("description").default(""),
    status: text("status").notNull().default("active"),
    priority: text("priority").notNull().default("medium"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    // array-contains uid → text[] + WHERE $1 = ANY(assigned_users)
    assignedUsers: text("assigned_users").array().notNull().default([]),
    createdBy: text("created_by"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_assigned_users_idx").using("gin", t.assignedUsers)],
);

// ─── Space: Lists & Tasks ────────────────────────────────────
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color"),
    // Firestore field `order` — dipertahankan namanya biar mapping client minim.
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lists_project_idx").on(t.projectId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    category: text("category").array().notNull().default([]),
    assignedTo: text("assigned_to").array().notNull().default([]),
    dueDate: timestamp("due_date", { withTimezone: true }),
    link: text("link").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_list_idx").on(t.listId),
    index("tasks_project_idx").on(t.projectId),
  ],
);

// ─── Docs ────────────────────────────────────────────────────
export const docs = pgTable(
  "docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").default(""),
    category: text("category").default("Other"),
    updatedBy: text("updated_by").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("docs_project_idx").on(t.projectId)],
);

// ─── Discussions & Replies ───────────────────────────────────
export const discussions = pgTable(
  "discussions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").default(""),
    authorId: text("author_id"),
    authorName: text("author_name"),
    status: text("status").notNull().default("open"), // open | solved
    // Tanpa FK (siklik dengan replies) — dijaga di API (reset saat reply solusi dihapus).
    solutionId: uuid("solution_id"),
    replyCount: integer("reply_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("discussions_project_idx").on(t.projectId)],
);

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => discussions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    authorId: text("author_id"),
    authorName: text("author_name"),
    isSolution: boolean("is_solution").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replies_discussion_idx").on(t.discussionId)],
);

// ─── Calendar Events ─────────────────────────────────────────
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }),
    color: text("color").default("#8b5cf6"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_project_idx").on(t.projectId)],
);
