// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    initializeAuth,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    browserPopupRedirectResolver,
    getAuth, // fallback si Auth ya fue inicializado en caliente (HMR)
    GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBzca0Xc72nVmeRnNDgmMNdQ6riMI9sqns",
    authDomain: "zent-9e08f.firebaseapp.com",
    projectId: "zent-9e08f",
    storageBucket: "zent-9e08f.appspot.com",
    messagingSenderId: "914474229659",
    appId: "1:914474229659:web:e66f0d2778da6433d28b3e",
    measurementId: "G-Y6DH5TFQYY"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Inicializa Auth con persistencias robustas y resolver de popup/redirect
let auth;
try {
    auth = initializeAuth(app, {
        persistence: [
            indexedDBLocalPersistence,     // la más confiable en móvil
            browserLocalPersistence,
            browserSessionPersistence,
        ],
        popupRedirectResolver: browserPopupRedirectResolver,
    });
} catch {
    // Si ya estaba inicializado (HMR en dev), sólo recupéralo
    auth = getAuth(app);
}

const db = getFirestore(app);

// (Opcional) si en algún sitio importas este provider:
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };