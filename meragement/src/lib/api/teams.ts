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
import type { Team } from "../types";

export async function createTeam(
  teamData: Partial<Team> & Record<string, unknown>
): Promise<DocumentReference<DocumentData>> {
  return await addDoc(collection(db, "teams"), {
    ...teamData,
    members: (teamData as Team).members || [],
    projectIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getTeams(): Promise<Team[]> {
  const snapshot = await getDocs(collection(db, "teams"));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Team);
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const docRef = doc(db, "teams", teamId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? ({ id: docSnap.id, ...(docSnap.data() as object) } as Team)
    : null;
}

export async function updateTeam(
  teamId: string,
  data: Partial<Team> & Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, "teams", teamId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteDoc(doc(db, "teams", teamId));
}
