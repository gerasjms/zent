import React, { useEffect, useState, useRef } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification,
} from "firebase/auth";
import { getApp } from "firebase/app";
// Corregimos la ruta de importación para que sea relativa
import { auth } from "../firebase.js";

// ============ Logger con marca de sesión ============
const SESSION_TAG = Math.random().toString(36).slice(2, 7).toUpperCase();
const now = () => new Date().toISOString().split("T")[1].slice(0, 12);
const LG = {
    info: (...a) => console.info(`[AuthGate ${SESSION_TAG}] ${now()}`, ...a),
    warn: (...a) => console.warn(`[AuthGate ${SESSION_TAG}] ${now()}`, ...a),
    error: (...a) => console.error(`[AuthGate ${SESSION_TAG}] ${now()}`, ...a),
    group: (l) => console.group(`[AuthGate ${SESSION_TAG}] ${now()} ${l}`),
    end: () => console.groupEnd(),
};

// ============ Detección de entorno ============
const uaMobileGuess =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const chMobile = navigator.userAgentData?.mobile ?? null;
const isMobileWeb = chMobile ?? uaMobileGuess;

const isInAppBrowser = /(FBAN|FBAV|Instagram|Line|Twitter|Pinterest|LinkedInApp)/i.test(
    navigator.userAgent
);

// Flags útiles para pruebas locales (opcional)
const qp = new URLSearchParams(location.search);
const FORCE_POPUP = qp.get("auth") === "popup";

// Clave para saber si salimos a redirect
const REDIRECT_KEY = "auth_redirect_in_progress";

export default function AuthGate({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // ---- Estados para Email/Pass ----
    const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [displayName, setDisplayName] = useState("");

    const [error, setError] = useState("");
    const [signingIn, setSigningIn] = useState(false);
    const signingInRef = useRef(false);
    // Usamos una ref para asegurarnos que el resultado del redirect se procese una sola vez
    const redirectResultProcessed = useRef(false);

    // Listener de Auth + resolución de redirect (LÓGICA REESCRITA)
    useEffect(() => {
        // Esta ref previene que la lógica se ejecute dos veces en StrictMode
        if (redirectResultProcessed.current) {
            return;
        }
        redirectResultProcessed.current = true;

        let unsub = () => { };

        // Primero, intentamos obtener el resultado de una redirección.
        getRedirectResult(auth)
            .then(userCredential => {
                sessionStorage.removeItem(REDIRECT_KEY);
                if (userCredential) {
                    LG.info("getRedirectResult SUCCESS", { uid: userCredential.user.uid });
                } else {
                    LG.info("No pending redirect result.");
                }
            })
            .catch(error => {
                LG.error("getRedirectResult FAILED", error);
                setError(error.message);
                sessionStorage.removeItem(REDIRECT_KEY);
            })
            .finally(() => {
                // DESPUÉS de procesar el redirect (exitoso o no),
                // establecemos el listener de estado como la fuente final de verdad.
                unsub = onAuthStateChanged(auth, (user) => {
                    LG.info("onAuthStateChanged FIRED", user ? { uid: user.uid } : null);
                    setUser(user);
                    setLoading(false); // Ahora sabemos el estado final y podemos dejar de cargar.
                });
            });

        return () => {
            unsub();
        };
    }, []);


    const signInGoogle = async () => {
        if (signingInRef.current) {
            LG.warn("[signInGoogle] ignored (busy)");
            return;
        }
        signingInRef.current = true;
        setSigningIn(true);
        setError("");

        LG.group("[Google Sign-In]");
        LG.info("UA mobile?:", isMobileWeb, "inApp?:", isInAppBrowser);

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        if (isMobileWeb && !FORCE_POPUP) {
            try {
                LG.info("→ Mobile device detected, using signInWithRedirect");
                sessionStorage.setItem(REDIRECT_KEY, "1");
                await signInWithRedirect(auth, provider);
            } catch (e) {
                LG.error("[redirect] error", e?.code, e?.message);
                setError(`${e?.code || "auth/error"}: ${e?.message}`);
                sessionStorage.removeItem(REDIRECT_KEY);
                signingInRef.current = false;
                setSigningIn(false);
            }
        } else {
            try {
                LG.info("→ Desktop device, trying signInWithPopup first");
                await signInWithPopup(auth, provider);
            } catch (e) {
                LG.error("[popup] error", e?.code, e?.message);
                const POPUP_BLOCKERS = new Set([
                    "auth/popup-blocked",
                    "auth/popup-closed-by-user",
                    "auth/cancelled-popup-request",
                    "auth/operation-not-supported-in-this-environment",
                ]);

                if (POPUP_BLOCKERS.has(e?.code)) {
                    try {
                        LG.info("→ popup failed, fallback to signInWithRedirect");
                        sessionStorage.setItem(REDIRECT_KEY, "1");
                        await signInWithRedirect(auth, provider);
                    } catch (e2) {
                        LG.error("[redirect] error", e2?.code, e2?.message);
                        setError(`${e2?.code || "auth/error"}: ${e2?.message}`);
                    }
                } else {
                    setError(`${e?.code || "auth/error"}: ${e?.message}`);
                }
            } finally {
                signingInRef.current = false;
                setSigningIn(false);
            }
        }
        LG.end();
    };

    const submitEmailPass = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (mode === "signin") {
                await signInWithEmailAndPassword(auth, email, pass);
            } else {
                if (pass.length < 6) throw { code: "auth/weak-password", message: "La contraseña debe tener al menos 6 caracteres." };
                if (pass !== confirm) throw { code: "auth/password-mismatch", message: "Las contraseñas no coinciden." };
                const { user: newUser } = await createUserWithEmailAndPassword(auth, email, pass);
                if (displayName?.trim()) await updateProfile(newUser, { displayName: displayName.trim() });
                await sendEmailVerification(newUser);
            }
        } catch (e2) {
            setError(`${e2?.code || "auth/error"}: ${e2?.message}`);
        }
    };

    const doLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-surface-50">
                <div className="text-slate-500 text-sm">Cargando sesión…</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
                <div className="card shadow-elev-2 w-full max-w-md">
                    <div className="card-body p-6">
                        <h1 className="text-lg font-semibold text-slate-900 text-center">
                            {mode === "signin" ? "Accede a tu cuenta" : "Crea tu cuenta"}
                        </h1>

                        {error && (
                            <div className="mt-4 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={signInGoogle}
                            className="btn btn-ghost w-full mt-5"
                            disabled={signingIn}
                        >
                            <span className="inline-flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                                    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.22 1.2-1.54 3.5-5.1 3.5a5.9 5.9 0 1 1 0-11.8c1.7 0 2.9.7 3.6 1.3l2.4-2.3C16.8 3 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c6.9 0 9.2-4.8 8.6-9.2H12z" />
                                </svg>
                                {mode === "signin" ? "Continuar con Google" : "Registrarte con Google"}
                            </span>
                        </button>

                        <div className="my-5 flex items-center gap-3">
                            <div className="h-px bg-surface-200 flex-1" />
                            <span className="text-[11px] text-slate-400">o con email</span>
                            <div className="h-px bg-surface-200 flex-1" />
                        </div>

                        <form onSubmit={submitEmailPass} className="space-y-3">
                            {mode === "signup" && (
                                <div>
                                    <label className="label">Nombre (opcional)</label>
                                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" placeholder="Tu nombre" autoComplete="name" />
                                </div>
                            )}
                            <div>
                                <label className="label">Email</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="tucorreo@ejemplo.com" autoComplete="email" />
                            </div>
                            <div>
                                <label className="label">Contraseña</label>
                                <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} className="input" placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                            </div>
                            {mode === "signup" && (
                                <div>
                                    <label className="label">Confirmar contraseña</label>
                                    <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" placeholder="••••••••" autoComplete="new-password" />
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary w-full" disabled={mode === "signup" && (!pass || pass !== confirm)}>
                                {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
                            </button>
                        </form>

                        <div className="mt-4 text-center text-[12px] text-slate-500">
                            {mode === "signin" ? (
                                <>
                                    ¿No tienes cuenta?{" "}
                                    <button type="button" onClick={() => setMode("signup")} className="underline">Crea una</button>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes cuenta?{" "}
                                    <button type="button" onClick={() => setMode("signin")} className="underline">Inicia sesión</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

