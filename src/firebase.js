// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    browserLocalPersistence,
    setPersistence,
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
    storageBucket: "zent-9e08f.firebasestorage.app",
    messagingSenderId: "914474229659",
    appId: "1:914474229659:web:e66f0d2778da6433d28b3e",
    measurementId: "G-Y6DH5TFQYY"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Asegura que la sesión persista en el navegador
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Provider de Google (si usas botón “Continuar con Google”)
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };