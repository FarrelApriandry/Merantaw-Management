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
