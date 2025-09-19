// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    initializeAuth,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    browserPopupRedirectResolver,
    getAuth,
    GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Aviso útil en dev si falta algo
if (import.meta.env.DEV) {
    for (const [k, v] of Object.entries(cfg)) {
        if (!v) console.warn(`[firebase] Falta variable de entorno: ${k}`);
    }
}

const app = getApps().length ? getApp() : initializeApp(cfg);

// Auth con persistencias
let auth;
try {
    auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
    });
} catch {
    auth = getAuth(app);
}

const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
