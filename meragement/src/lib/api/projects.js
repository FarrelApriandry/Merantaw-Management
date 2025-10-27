import { db, serverTimestamp } from "../firebaseConfig";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from "firebase/firestore";

export async function createProject(projectData) {
    return await addDoc(collection(db, "projects"), {
        ...projectData,
        status: projectData.status || "active",
        priority: projectData.priority || "medium",
        startDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function getProjects() {
    const snapshot = await getDocs(collection(db, "projects"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getProjectById(projectId) {
    const docRef = doc(db, "projects", projectId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateProject(projectId, data) {
    const docRef = doc(db, "projects", projectId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProject(projectId) {
    await deleteDoc(doc(db, "projects", projectId));
}
