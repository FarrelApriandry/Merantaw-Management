import { db, serverTimestamp } from "../firebaseConfig";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from "firebase/firestore";

export async function createTeam(teamData) {
    return await addDoc(collection(db, "teams"), {
        ...teamData,
        members: teamData.members || [],
        projectIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function getTeams() {
    const snapshot = await getDocs(collection(db, "teams"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getTeamById(teamId) {
    const docRef = doc(db, "teams", teamId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateTeam(teamId, data) {
    const docRef = doc(db, "teams", teamId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTeam(teamId) {
    await deleteDoc(doc(db, "teams", teamId));
}
