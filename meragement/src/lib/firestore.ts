import { db, serverTimestamp } from "./firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  increment,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  SpaceList,
  Task,
  Project,
  DocItem,
  Discussion,
  Reply,
  CalEvent,
} from "./types";

// ─── Path helpers ────────────────────────────────────────────
export const listsCol = (projectId: string): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/lists`);

export const tasksCol = (
  projectId: string,
  listId: string
): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/lists/${listId}/tasks`);

export const taskDoc = (
  projectId: string,
  listId: string,
  taskId: string
): DocumentReference<DocumentData> =>
  doc(db, `projects/${projectId}/lists/${listId}/tasks`, taskId);

// ─── Project ─────────────────────────────────────────────────
export async function getProjectData(projectId: string): Promise<Project | null> {
  const ref = doc(db, "projects", projectId);
  const snap = await getDoc(ref);
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as object) } as Project)
    : null;
}

// ─── Lists CRUD ──────────────────────────────────────────────
export async function getLists(projectId: string): Promise<SpaceList[]> {
  const q = query(listsCol(projectId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as SpaceList);
}

export async function createList(
  projectId: string,
  data: Partial<SpaceList> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(listsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateList(
  projectId: string,
  listId: string,
  data: Partial<SpaceList> & Record<string, unknown>
): Promise<void> {
  const ref = doc(db, `projects/${projectId}/lists`, listId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteList(projectId: string, listId: string): Promise<void> {
  // P1: cascade — hapus tasks di subcollection agar tidak orphan
  const tSnap = await getDocs(tasksCol(projectId, listId));
  const batch = writeBatch(db);
  tSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, `projects/${projectId}/lists`, listId));
  await batch.commit();
}

// ─── Tasks CRUD (nested under list) ─────────────────────────
export async function createTask(
  projectId: string,
  listId: string,
  data: Partial<Task> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(tasksCol(projectId, listId), {
    ...data,
    listId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(
  projectId: string,
  listId: string,
  taskId: string,
  data: Partial<Task> & Record<string, unknown>
): Promise<void> {
  await updateDoc(taskDoc(projectId, listId, taskId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(
  projectId: string,
  listId: string,
  taskId: string
): Promise<void> {
  await deleteDoc(taskDoc(projectId, listId, taskId));
}

export function onTasksSnapshot(
  projectId: string,
  listId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  return onSnapshot(tasksCol(projectId, listId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Task));
  });
}

export function onListsSnapshot(
  projectId: string,
  callback: (lists: SpaceList[]) => void
): Unsubscribe {
  const q = query(listsCol(projectId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as SpaceList));
  });
}

// ─── Batch delete tasks ──────────────────────────────────────
export async function batchDeleteTasks(
  projectId: string,
  listId: string,
  taskIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  taskIds.forEach((id) => batch.delete(taskDoc(projectId, listId, id)));
  await batch.commit();
}


// ─── Docs CRUD ───────────────────────────────────────────────
export const docsCol = (projectId: string): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/docs`);

export async function getProjectDocs(projectId: string): Promise<DocItem[]> {
  const q = query(docsCol(projectId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as DocItem);
}

export async function getDocById(
  projectId: string,
  docId: string
): Promise<DocItem | null> {
  const ref = doc(db, `projects/${projectId}/docs`, docId);
  const snap = await getDoc(ref);
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as object) } as DocItem)
    : null;
}

export async function createDoc(
  projectId: string,
  data: Partial<DocItem> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(docsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocContent(
  projectId: string,
  docId: string,
  data: Partial<DocItem> & Record<string, unknown>
): Promise<void> {
  const ref = doc(db, `projects/${projectId}/docs`, docId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(
  projectId: string,
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, `projects/${projectId}/docs`, docId));
}

export function onDocsSnapshot(
  projectId: string,
  callback: (docs: DocItem[]) => void
): Unsubscribe {
  const q = query(docsCol(projectId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as DocItem));
  });
}


// ─── Discussions CRUD ────────────────────────────────────────
export const discussionsCol = (
  projectId: string
): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/discussions`);

export const repliesCol = (
  projectId: string,
  discussionId: string
): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/discussions/${discussionId}/replies`);

export async function createDiscussion(
  projectId: string,
  data: Partial<Discussion> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(discussionsCol(projectId), {
    ...data,
    status: "open",
    solutionId: null,
    replyCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function onDiscussionsSnapshot(
  projectId: string,
  callback: (discussions: Discussion[]) => void
): Unsubscribe {
  const q = query(discussionsCol(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Discussion)
    );
  });
}

export async function createReply(
  projectId: string,
  discussionId: string,
  data: Partial<Reply> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  const replyRef = await addDoc(repliesCol(projectId, discussionId), {
    ...data,
    isSolution: false,
    createdAt: serverTimestamp(),
  });
  // P0: atomik — cegah race read-then-write replyCount
  const discRef = doc(db, `projects/${projectId}/discussions`, discussionId);
  await updateDoc(discRef, {
    replyCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
  return replyRef;
}

export function onRepliesSnapshot(
  projectId: string,
  discussionId: string,
  callback: (replies: Reply[]) => void
): Unsubscribe {
  const q = query(repliesCol(projectId, discussionId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Reply));
  });
}

export async function markAsSolution(
  projectId: string,
  discussionId: string,
  replyId: string,
  requesterUid?: string
): Promise<void> {
  const discRef = doc(db, `projects/${projectId}/discussions`, discussionId);

  // P1: verifikasi author — hanya author diskusi yang boleh menandai solusi.
  // Rules Firestore juga membatasi status/solutionId hanya author/admin.
  const discSnap = await getDoc(discRef);
  if (!discSnap.exists()) throw new Error("Discussion not found");
  const discData = discSnap.data() as Discussion;
  if (requesterUid && discData.authorId && discData.authorId !== requesterUid) {
    throw new Error("Only the discussion author can mark a solution");
  }

  const batch = writeBatch(db);
  const prevSolutionId = discData.solutionId;

  // Reset previous solution if exists
  if (prevSolutionId && prevSolutionId !== replyId) {
    const prevRef = doc(db, `projects/${projectId}/discussions/${discussionId}/replies`, prevSolutionId);
    batch.update(prevRef, { isSolution: false });
  }

  // Mark new reply as solution
  const replyRef = doc(db, `projects/${projectId}/discussions/${discussionId}/replies`, replyId);
  batch.update(replyRef, { isSolution: true });

  // Update discussion status
  batch.update(discRef, { status: "solved", solutionId: replyId, updatedAt: serverTimestamp() });

  await batch.commit();
}

export async function deleteDiscussion(projectId: string, discussionId: string): Promise<void> {
  // P1: cascade — hapus replies agar tidak orphan
  const rSnap = await getDocs(repliesCol(projectId, discussionId));
  const batch = writeBatch(db);
  rSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, `projects/${projectId}/discussions`, discussionId));
  await batch.commit();
}


// ─── Events CRUD ─────────────────────────────────────────────
export const eventsCol = (
  projectId: string
): CollectionReference<DocumentData> =>
  collection(db, `projects/${projectId}/events`);

export async function createEvent(
  projectId: string,
  data: Partial<CalEvent> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(eventsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  data: Partial<CalEvent> & Record<string, unknown>
): Promise<void> {
  const ref = doc(db, `projects/${projectId}/events`, eventId);
  await updateDoc(ref, { ...data });
}

export async function deleteEvent(projectId: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, `projects/${projectId}/events`, eventId));
}

export function onEventsSnapshot(
  projectId: string,
  callback: (events: CalEvent[]) => void
): Unsubscribe {
  return onSnapshot(eventsCol(projectId), (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as CalEvent)
    );
  });
}
