import { db, serverTimestamp } from "../firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import type { AppUser } from "../types";

// CREATE
export async function createUser(
  userData: Partial<AppUser> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(collection(db, "users"), {
    ...userData,
    createdAt: serverTimestamp(),
    lastLogin: null,
    isActive: true,
  });
}

// READ (all)
export async function getUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...(d.data() as object) }) as AppUser
  );
}

// READ (single)
export async function getUserById(userId: string): Promise<AppUser | null> {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...(docSnap.data() as object) } as AppUser)
    : null;
}

// UPDATE
export async function updateUser(
  userId: string,
  data: Partial<AppUser> & Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

// DELETE
export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId));
}
