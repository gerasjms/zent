// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Header() {
    const [user, setUser] = useState(null);
    const [open, setOpen] = useState(false);
    const closeTimer = useRef(null);

    useEffect(() => {
        setUser(auth.currentUser || null);
    }, []);

    const startClose = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    };
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    };

    const handleLogout = async () => {
        await signOut(auth);
        window.location.reload();
    };

    const goToLogin = () => window.location.reload();

    const displayName =
        user?.displayName ||
        user?.email?.split("@")[0] ||
        user?.providerData?.[0]?.email ||
        "Usuario";
    const email = user?.email || user?.providerData?.[0]?.email || "";
    const photo =
        user?.photoURL || user?.providerData?.[0]?.photoURL || null;

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="mx-auto w-full lg:w-4/5 px-4 h-14 flex items-center justify-between">
                {/* Marca */}
                <a href="/" className="flex items-center gap-2 text-slate-900 font-semibold tracking-wide">
                    <img
                        src="/assets/pwa-192.png"   // o /assets/pwa-512.png
                        alt="Zent"
                        className="h-7 w-7"
                    />
                    <span>Zent</span>
                </a>


                {/* Perfil */}
                <div
                    className="relative"
                    onMouseEnter={cancelClose}
                    onMouseLeave={startClose}
                >
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        className="group flex items-center gap-3 pl-1 pr-2 py-1.5 rounded-full bg-transparent transition
                       hover:bg-slate-100 focus:bg-slate-100 focus:outline-none
                       ring-0 focus:ring-1 focus:ring-slate-200"
                    >
                        {/* Avatar: foto si hay, inicial si no */}
                        {photo ? (
                            <img
                                src={photo}
                                alt={displayName}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                                {displayName.slice(0, 1).toUpperCase()}
                            </span>
                        )}

                        <div className="text-left leading-tight hidden sm:block">
                            <div className="text-sm font-medium text-slate-900 truncate max-w-[160px]">
                                {displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                                {email}
                            </div>
                        </div>

                        <svg
                            className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    {open && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl p-1.5 z-50"
                            onMouseEnter={cancelClose}
                            onMouseLeave={startClose}
                        >
                            {user ? (
                                <>
                                    <div className="px-2 py-2 text-xs text-slate-500">
                                        Sesión iniciada
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
                                    >
                                        Cerrar sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="px-2 py-2 text-xs text-slate-500">
                                        No has iniciado sesión
                                    </div>
                                    <button
                                        onClick={goToLogin}
                                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
                                    >
                                        Iniciar sesión
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
