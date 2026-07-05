
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling for better connectivity in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export default app;
