// src/lib/firebaseConfig.ts — P0: getEmailAuth utamakan Firebase Auth session
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env
    .PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID as string,
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export { serverTimestamp };

export function getEmailAuth(): string | null {
  // P0: sumber kebenaran = Firebase Auth, bukan localStorage (mudah dipalsu)
  const email = auth.currentUser?.email;
  if (email) return email;
  if (typeof window !== "undefined") {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { email?: string };
        return parsed.email ?? null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

