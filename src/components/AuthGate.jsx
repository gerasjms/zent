// src/components/AuthGate.jsx
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
import { auth } from "../firebase";

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
const FORCE_POPUP =
    qp.get("auth") === "popup" || (import.meta?.env?.VITE_FORCE_POPUP ?? "") === "1";

// Clave para saber si salimos a redirect
const REDIRECT_KEY = "auth_redirect_in_progress";

export default function AuthGate({ children }) {
    const [loading, setLoading] = useState(true);
    const [resolvingRedirect, setResolvingRedirect] = useState(false);
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

    const switchMode = (newMode) => {
        setMode(newMode);
        setError("");
        setPass("");
        setConfirm("");
    };

    // Logs globales / diagnóstico
    useEffect(() => {
        const onRejection = (e) => LG.error("[UNHANDLED REJECTION]", e?.reason || e);
        const onError = (e) => LG.error("[WINDOW ERROR]", e?.message, e?.error || e);
        window.addEventListener("unhandledrejection", onRejection);
        window.addEventListener("error", onError);

        try {
            LG.info("[App Options]", getApp().options);
            LG.info("[Origin]", window.location.origin);
        } catch { }
        LG.info("[UA]", navigator.userAgent);
        LG.info("[Flags]", {
            isMobileWeb,
            chMobile,
            uaMobileGuess,
            FORCE_POPUP,
            isInAppBrowser,
            isSecureContext: window.isSecureContext,
            cookieEnabled: navigator.cookieEnabled,
            visibility: document.visibilityState,
        });

        if (isInAppBrowser) {
            LG.warn("[Diag] In-App Browser detectado → abrir en Chrome/Safari externo.");
            setError(
                "Tu navegador integrado (Instagram/Facebook/WhatsApp) bloquea el inicio de sesión. Ábrelo en Chrome o Safari."
            );
        }

        if (!navigator.cookieEnabled) {
            LG.warn("[Diag] Cookies deshabilitadas; login puede fallar.");
        }

        if (navigator.storage?.estimate) {
            navigator.storage.estimate().then((e) => {
                LG.info("[Storage estimate]", {
                    quotaMB: Math.round((e.quota || 0) / 1048576),
                    usageMB: Math.round((e.usage || 0) / 1048576),
                });
            });
        }

        return () => {
            window.removeEventListener("unhandledrejection", onRejection);
            window.removeEventListener("error", onError);
        };
    }, []);

    // Listener de Auth + resolución de redirect
    useEffect(() => {
        let unsub = () => { };
        (async () => {
            LG.group("[BOOT]");

            unsub = onAuthStateChanged(auth, (u) => {
                LG.info("[onAuthStateChanged]", u ? { uid: u.uid, email: u.email } : null);
                setUser(u || null);
                if (!sessionStorage.getItem(REDIRECT_KEY)) setLoading(false);
                if (u) sessionStorage.removeItem(REDIRECT_KEY);
            });

            const pending = sessionStorage.getItem(REDIRECT_KEY);
            LG.info("[Redirect Pending?]", pending);

            if (pending) {
                setResolvingRedirect(true);
                try {
                    LG.info("[getRedirectResult] start");
                    const res = await getRedirectResult(auth);
                    if (res?.user) {
                        LG.info("[getRedirectResult] OK", { uid: res.user.uid, email: res.user.email });
                        setUser(res.user);
                    } else {
                        LG.warn("[getRedirectResult] sin resultado");
                    }
                } catch (e) {
                    LG.error("[getRedirectResult] error", e?.code, e?.message);
                    setError(`${e?.code || "auth/error"}: ${e?.message}`);
                } finally {
                    sessionStorage.removeItem(REDIRECT_KEY);
                    setResolvingRedirect(false);
                    setLoading(false);
                    LG.info("[getRedirectResult] done");
                    LG.end();
                }
            } else {
                LG.end();
            }
        })();

        return () => {
            try {
                unsub();
            } catch { }
        };
    }, []);

    // Login con Google: intenta POPUP primero, fallback a REDIRECT
    const signInGoogle = async () => {
        if (signingInRef.current) {
            LG.warn("[signInGoogle] ignored (busy)");
            return;
        }
        signingInRef.current = true;
        setSigningIn(true);
        setError("");

        LG.group("[Google Sign-In]");
        LG.info("UA mobile?:", isMobileWeb, "inApp?:", isInAppBrowser, "FORCE_POPUP:", FORCE_POPUP);

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        try {
            // 1) Intentar POPUP SIEMPRE (desktop y móvil). Si bloquea, caeremos a redirect.
            LG.info("→ trying signInWithPopup first");
            const t = performance.now();
            const cred = await signInWithPopup(auth, provider);
            LG.info("popup OK", { uid: cred?.user?.uid, ms: Math.round(performance.now() - t) });
        } catch (e) {
            LG.error("[popup] error", e?.code, e?.message);

            // 2) Fallback a REDIRECT solo en errores esperables de popup
            const POPUP_BLOCKERS = new Set([
                "auth/popup-blocked",
                "auth/popup-closed-by-user",
                "auth/cancelled-popup-request",
                "auth/operation-not-supported-in-this-environment",
            ]);

            if (FORCE_POPUP && !POPUP_BLOCKERS.has(e?.code)) {
                // Si forzaste popup y el error no es de bloqueo, muéstralo tal cual
                setError(`${e?.code || "auth/error"}: ${e?.message}`);
            } else if (POPUP_BLOCKERS.has(e?.code)) {
                if (isInAppBrowser) {
                    setError(
                        "El navegador dentro de la app (Instagram/Facebook/WhatsApp) bloquea el login. Ábrelo en Chrome o Safari."
                    );
                } else {
                    try {
                        LG.info("→ fallback to signInWithRedirect");
                        sessionStorage.setItem(REDIRECT_KEY, "1");
                        await signInWithRedirect(auth, provider); // mismo tab
                    } catch (e2) {
                        LG.error("[redirect] error", e2?.code, e2?.message);
                        setError(`${e2?.code || "auth/error"}: ${e2?.message}`);
                    }
                }
            } else {
                // Error real distinto a bloqueo => mostrarlo
                setError(`${e?.code || "auth/error"}: ${e?.message}`);
            }
        } finally {
            LG.end();
            signingInRef.current = false;
            setSigningIn(false);
        }
    };

    const submitEmailPass = async (e) => {
        e.preventDefault();
        setError("");
        LG.group("[Email/Pass]");
        LG.info("mode:", mode, "email:", email);
        try {
            if (mode === "signin") {
                await signInWithEmailAndPassword(auth, email, pass);
            } else {
                // --- Registro ---
                if (pass.length < 6) {
                    throw { code: "auth/weak-password", message: "La contraseña debe tener al menos 6 caracteres." };
                }
                if (pass !== confirm) {
                    throw { code: "auth/password-mismatch", message: "Las contraseñas no coinciden." };
                }
                const { user } = await createUserWithEmailAndPassword(auth, email, pass);

                // Guardar displayName opcional
                if (displayName?.trim()) {
                    await updateProfile(user, { displayName: displayName.trim() });
                }

                // Enviar verificación de correo (opcional)
                try {
                    await sendEmailVerification(user);
                    LG.info("verification email sent");
                } catch (ve) {
                    LG.warn("verification email failed", ve?.code, ve?.message);
                }
            }
            LG.info("email/pass OK");
        } catch (e2) {
            LG.error("email/pass error", e2?.code, e2?.message);
            setError(`${e2?.code || "auth/error"}: ${e2?.message}`);
        } finally {
            LG.end();
        }
    };

    const doLogout = async () => {
        setError("");
        try {
            await signOut(auth);
            LG.info("[Logout] OK");
        } catch (e) {
            LG.error("[Logout] error", e?.code, e?.message);
            setError(`${e?.code || "auth/error"}: ${e?.message}`);
        }
    };

    if (loading || resolvingRedirect) {
        return (
            <div className="min-h-screen grid place-items-center">
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
                        <p className="helper text-center mt-1">
                            Tus datos se guardarán en Firestore bajo tu usuario.
                        </p>

                        {error && (
                            <div className="mt-4 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                {error}
                            </div>
                        )}

                        {/* Google */}
                        <button
                            onClick={signInGoogle}
                            className="btn btn-ghost w-full mt-5"
                            disabled={signingIn}
                        >
                            <span className="inline-flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                                    <path
                                        fill="#EA4335"
                                        d="M12 10.2v3.6h5.1c-.22 1.2-1.54 3.5-5.1 3.5a5.9 5.9 0 1 1 0-11.8c1.7 0 2.9.7 3.6 1.3l2.4-2.3C16.8 3 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c6.9 0 9.2-4.8 8.6-9.2H12z"
                                    />
                                </svg>
                                {mode === "signin" ? "Continuar con Google" : "Registrarte con Google"}
                            </span>
                        </button>

                        <div className="my-5 flex items-center gap-3">
                            <div className="h-px bg-surface-200 flex-1" />
                            <span className="text-[11px] text-slate-400">o con email</span>
                            <div className="h-px bg-surface-200 flex-1" />
                        </div>

                        {/* Email / Password */}
                        <form onSubmit={submitEmailPass} className="space-y-3">
                            {mode === "signup" && (
                                <div>
                                    <label className="label">Nombre (opcional)</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="input"
                                        placeholder="Tu nombre"
                                        autoComplete="name"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="tucorreo@ejemplo.com"
                                    autoComplete="email"
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
                                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                />
                            </div>

                            {mode === "signup" && (
                                <div>
                                    <label className="label">Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className="input"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={mode === "signup" && (!pass || pass !== confirm)}
                            >
                                {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
                            </button>
                        </form>

                        {/* Footers: toggles y reset password */}
                        <div className="mt-4 text-center text-[12px] text-slate-500">
                            {mode === "signin" ? (
                                <>
                                    ¿No tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signup")}
                                        className="underline"
                                    >
                                        Crea una
                                    </button>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signin")}
                                        className="underline"
                                    >
                                        Inicia sesión
                                    </button>
                                </>
                            )}
                        </div>

                        {mode === "signin" && (
                            <div className="mt-2 text-center">
                                <button
                                    type="button"
                                    className="text-[12px] underline text-slate-500"
                                    onClick={async () => {
                                        setError("");
                                        try {
                                            if (!email) throw new Error("Ingresa tu email arriba para enviarte el enlace.");
                                            await sendPasswordResetEmail(auth, email);
                                            LG.info("[PasswordReset] email sent");
                                            alert("Te enviamos un enlace para restablecer tu contraseña.");
                                        } catch (err) {
                                            LG.error("[PasswordReset] error", err);
                                            setError(`password-reset: ${err.message || err}`);
                                        }
                                    }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        )}

                        <button onClick={doLogout} className="hidden mt-4 text-[11px] text-slate-400 underline">
                            Forzar logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
