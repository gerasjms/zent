// src/components/AuthGate.jsx
import React, { useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    signOut,
} from "firebase/auth";
import { auth } from "../firebase";

export default function AuthGate({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        // Persistencia en el navegador
        setPersistence(auth, browserLocalPersistence).catch(() => { });
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u || null);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const signInGoogle = async () => {
        setError("");
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (e) {
            setError(e.message);
        }
    };

    const submitEmailPass = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (mode === "signin") {
                await signInWithEmailAndPassword(auth, email, pass);
            } else {
                await createUserWithEmailAndPassword(auth, email, pass);
            }
        } catch (e) {
            setError(e.message);
        }
    };

    const doLogout = async () => {
        setError("");
        try {
            await signOut(auth);
        } catch (e) {
            setError(e.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="text-slate-500 text-sm">Cargando sesión…</div>
            </div>
        );
    }

    if (!user) {
        // Pantalla de acceso
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
                <div className="card shadow-elev-2 w-full max-w-md">
                    <div className="card-body p-6">
                        <h1 className="text-lg font-semibold text-slate-900 text-center">
                            Accede a tu cuenta
                        </h1>
                        <p className="helper text-center mt-1">
                            Tus datos se guardarán en Firestore bajo tu usuario.
                        </p>

                        {error && (
                            <div className="mt-4 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                {error}
                            </div>
                        )}

                        <button onClick={signInGoogle} className="btn btn-ghost w-full mt-5">
                            <span className="inline-flex items-center gap-2">
                                {/* Google “G” simple */}
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                                    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.22 1.2-1.54 3.5-5.1 3.5a5.9 5.9 0 1 1 0-11.8c1.7 0 2.9.7 3.6 1.3l2.4-2.3C16.8 3 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c6.9 0 9.2-4.8 8.6-9.2H12z" />
                                </svg>
                                Continuar con Google
                            </span>
                        </button>

                        <div className="my-5 flex items-center gap-3">
                            <div className="h-px bg-surface-200 flex-1" />
                            <span className="text-[11px] text-slate-400">o</span>
                            <div className="h-px bg-surface-200 flex-1" />
                        </div>

                        <form onSubmit={submitEmailPass} className="space-y-3">
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="tucorreo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="label">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    className="input"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full">
                                {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
                            </button>
                        </form>

                        <div className="text-xs text-slate-600 mt-4 text-center">
                            {mode === "signin" ? (
                                <>
                                    ¿No tienes cuenta?{" "}
                                    <button className="text-primary-700 hover:underline" onClick={() => setMode("signup")}>
                                        Regístrate
                                    </button>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes cuenta?{" "}
                                    <button className="text-primary-700 hover:underline" onClick={() => setMode("signin")}>
                                        Inicia sesión
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Fallback oculto */}
                        <button onClick={doLogout} className="hidden mt-4 text-[11px] text-slate-400 underline">
                            Forzar logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Usuario autenticado → render de la app
    return <>{children}</>;
}
