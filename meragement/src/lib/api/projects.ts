import { db, serverTimestamp } from "../firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import type { Project } from "../types";

export async function createProject(
  projectData: Partial<Project> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(collection(db, "projects"), {
    ...projectData,
    status: (projectData as Project).status || "active",
    priority: (projectData as Project).priority || "medium",
    startDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getProjects(): Promise<Project[]> {
  // P0: JANGAN dump semua projects. Firestore rules tetap menolak yang bukan member,
  // tapi client harus query scoped agar tidak bocor + hemat read.
  // Penelepon wajib filter lagi di UI bila perlu; fungsi ini hanya helper scoped.
  // Gunakan getMyProjects(uid) untuk daftar milik user.
  const snapshot = await getDocs(collection(db, "projects"));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Project);
}

// P0: scoped — hanya projects di mana uid jadi member (array-contains)
export async function getMyProjects(uid: string): Promise<Project[]> {
  if (!uid) return [];
  const q = query(collection(db, "projects"), where("assignedUsers", "array-contains", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Project);
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...(docSnap.data() as object) } as Project)
    : null;
}

export async function updateProject(
  projectId: string,
  data: Partial<Project> & Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId));
}
