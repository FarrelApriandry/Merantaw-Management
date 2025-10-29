// src\lib\firestore.js
import { db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export async function getProjectData(projectId) {
    const ref = doc(db, "projects", projectId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}