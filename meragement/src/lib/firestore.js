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
} from "firebase/firestore";

// ─── Path helpers ────────────────────────────────────────────
export const listsCol = (projectId) =>
  collection(db, `projects/${projectId}/lists`);

export const tasksCol = (projectId, listId) =>
  collection(db, `projects/${projectId}/lists/${listId}/tasks`);

export const taskDoc = (projectId, listId, taskId) =>
  doc(db, `projects/${projectId}/lists/${listId}/tasks`, taskId);

// ─── Project ─────────────────────────────────────────────────
export async function getProjectData(projectId) {
  const ref = doc(db, "projects", projectId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Lists CRUD ──────────────────────────────────────────────
export async function getLists(projectId) {
  const q = query(listsCol(projectId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createList(projectId, data) {
  return await addDoc(listsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateList(projectId, listId, data) {
  const ref = doc(db, `projects/${projectId}/lists`, listId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteList(projectId, listId) {
  await deleteDoc(doc(db, `projects/${projectId}/lists`, listId));
}

// ─── Tasks CRUD (nested under list) ─────────────────────────
export async function createTask(projectId, listId, data) {
  return await addDoc(tasksCol(projectId, listId), {
    ...data,
    listId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(projectId, listId, taskId, data) {
  await updateDoc(taskDoc(projectId, listId, taskId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(projectId, listId, taskId) {
  await deleteDoc(taskDoc(projectId, listId, taskId));
}

export function onTasksSnapshot(projectId, listId, callback) {
  return onSnapshot(tasksCol(projectId, listId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function onListsSnapshot(projectId, callback) {
  const q = query(listsCol(projectId), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Batch delete tasks ──────────────────────────────────────
export async function batchDeleteTasks(projectId, listId, taskIds) {
  const batch = writeBatch(db);
  taskIds.forEach((id) => batch.delete(taskDoc(projectId, listId, id)));
  await batch.commit();
}


// ─── Docs CRUD ───────────────────────────────────────────────
export const docsCol = (projectId) =>
  collection(db, `projects/${projectId}/docs`);

export async function getProjectDocs(projectId) {
  const q = query(docsCol(projectId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDocById(projectId, docId) {
  const ref = doc(db, `projects/${projectId}/docs`, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDoc(projectId, data) {
  return await addDoc(docsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocContent(projectId, docId, data) {
  const ref = doc(db, `projects/${projectId}/docs`, docId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(projectId, docId) {
  await deleteDoc(doc(db, `projects/${projectId}/docs`, docId));
}

export function onDocsSnapshot(projectId, callback) {
  const q = query(docsCol(projectId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}


// ─── Discussions CRUD ────────────────────────────────────────
export const discussionsCol = (projectId) =>
  collection(db, `projects/${projectId}/discussions`);

export const repliesCol = (projectId, discussionId) =>
  collection(db, `projects/${projectId}/discussions/${discussionId}/replies`);

export async function createDiscussion(projectId, data) {
  return await addDoc(discussionsCol(projectId), {
    ...data,
    status: "open",
    solutionId: null,
    replyCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function onDiscussionsSnapshot(projectId, callback) {
  const q = query(discussionsCol(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createReply(projectId, discussionId, data) {
  const replyRef = await addDoc(repliesCol(projectId, discussionId), {
    ...data,
    isSolution: false,
    createdAt: serverTimestamp(),
  });
  // Increment reply count
  const discRef = doc(db, `projects/${projectId}/discussions`, discussionId);
  const snap = await getDoc(discRef);
  if (snap.exists()) {
    await updateDoc(discRef, { replyCount: (snap.data().replyCount || 0) + 1, updatedAt: serverTimestamp() });
  }
  return replyRef;
}

export function onRepliesSnapshot(projectId, discussionId, callback) {
  const q = query(repliesCol(projectId, discussionId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function markAsSolution(projectId, discussionId, replyId) {
  const batch = writeBatch(db);
  const discRef = doc(db, `projects/${projectId}/discussions`, discussionId);

  // Get current discussion to check for existing solution
  const discSnap = await getDoc(discRef);
  const prevSolutionId = discSnap.data()?.solutionId;

  // Reset previous solution if exists
  if (prevSolutionId) {
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


// ─── Events CRUD ─────────────────────────────────────────────
export const eventsCol = (projectId) =>
  collection(db, `projects/${projectId}/events`);

export async function createEvent(projectId, data) {
  return await addDoc(eventsCol(projectId), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvent(projectId, eventId, data) {
  const ref = doc(db, `projects/${projectId}/events`, eventId);
  await updateDoc(ref, { ...data });
}

export async function deleteEvent(projectId, eventId) {
  await deleteDoc(doc(db, `projects/${projectId}/events`, eventId));
}

export function onEventsSnapshot(projectId, callback) {
  return onSnapshot(eventsCol(projectId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
