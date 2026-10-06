// Central domain types — replaces src/lib/types.js (JSDoc typedefs)
// All Firestore-backed models include `id` (doc id). Timestamps may be
// Firestore Timestamp, JS Date, or plain { seconds } shape from cache.
import type { Timestamp } from "firebase/firestore";

export type FirestoreTimestampLike =
  | Timestamp
  | Date
  | { seconds: number; nanoseconds?: number }
  | string
  | number
  | null
  | undefined;

export type TaskStatus = "draft" | "todo" | "in_progress" | "done";
export type ProjectStatus = "active" | "archived" | string;
export type ProjectPriority = "low" | "medium" | "high" | string;
export type DiscussionStatus = "open" | "solved" | string;

export interface AppUser {
  id: string;
  uid?: string;
  name?: string;
  email: string;
  role: "admin" | "member" | string;
  status?: string;
  isActive?: boolean;
  photoURL?: string;
  joinedTeams?: string[];
  createdBy?: string | null;
  createdAt?: FirestoreTimestampLike;
  lastLogin?: FirestoreTimestampLike | null;
  updatedAt?: FirestoreTimestampLike;
}

export interface StoredUser {
  uid: string;
  email: string;
  role: string;
  status?: string;
  name?: string;
  isActive?: boolean;
}

export interface Project {
  id: string;
  title: string;
  shortCall?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  teamId?: string;
  assignedUsers?: string[];
  createdBy?: string | null;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  startDate?: FirestoreTimestampLike;
}

export interface TeamMember {
  userId: string;
  roles: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members?: TeamMember[];
  projectIds?: string[];
  createdBy?: string | null;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface SpaceList {
  id: string;
  name: string;
  icon?: string;
  order?: number;
  color?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface Task {
  id: string;
  listId?: string;
  title: string;
  status?: TaskStatus | string;
  category?: string[];
  assignedTo?: string | string[];
  dueDate?: FirestoreTimestampLike;
  link?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface DocItem {
  id: string;
  title: string;
  content?: string;
  category?: string;
  updatedBy?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface Discussion {
  id: string;
  title: string;
  content?: string;
  authorId?: string;
  authorName?: string;
  status?: DiscussionStatus;
  solutionId?: string | null;
  replyCount?: number;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface Reply {
  id: string;
  content: string;
  authorId?: string;
  authorName?: string;
  isSolution?: boolean;
  createdAt?: FirestoreTimestampLike;
}

export interface CalEvent {
  id: string;
  title: string;
  start?: FirestoreTimestampLike;
  end?: FirestoreTimestampLike;
  color?: string;
}

export interface InboxEmail {
  from: string;
  subject: string;
  date: string | number;
}

export function toDateSafe(val: FirestoreTimestampLike): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && "seconds" in (val as object)) {
    const s = (val as { seconds: number }).seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  if (typeof (val as Timestamp)?.toDate === "function") {
    try {
      return (val as Timestamp).toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}
