import { db, serverTimestamp } from "../firebaseConfig";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from "firebase/firestore";

// CREATE
export async function createUser(userData) {
    return await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: null,
        isActive: true,
    });
}

// READ (all)
export async function getUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// READ (single)
export async function getUserById(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// UPDATE
export async function updateUser(userId, data) {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

// DELETE
export async function deleteUser(userId) {
    await deleteDoc(doc(db, "users", userId));
}
